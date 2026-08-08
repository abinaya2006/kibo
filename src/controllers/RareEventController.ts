import type { RareEventKind, RareEventData, Vec2 } from "../models/types";
import { PET_SIZE } from "../models/PetConfig";
import { usePetStore } from "../state/usePetStore";
import { EventBus } from "../services/EventBus";

/**
 * Every few hours, something unusual wanders across the screen — a
 * butterfly, a paper airplane, a ladybug, a firefly, a falling leaf, a
 * tiny star. Kibo gives chase. Rarity is the whole point, so this stays
 * quiet and infrequent by design.
 *
 * Deliberately reuses the existing "chasingCursor" pet state + the
 * targetPosition-driven physics already in MovementController, so no
 * changes are needed to PetSprite/AnimationRegistry to see it working.
 */

 // Ultra-fast testing
 const RARE_EVENTS_ENABLED = false;
 const MIN_INTERVAL_MS = 1000 * 1000;       // 2s
 const MAX_INTERVAL_MS = 500 * 1000;       // 5s
 const RETRY_DELAY_MS = 10000;             // 0.5s
 const WANDER_TICK_MS = 16;              // ~60 FPS
 const EVENT_LIFETIME_MS = 5 * 1000;     // 5s
 const CATCH_RADIUS = 34;

const RARE_EVENT_KINDS: RareEventKind[] = [
  "butterfly",
  "paperAirplane",
  "ladybug",
  "firefly",
  "leaf",
  "star",
];

const KIND_SPEEDS: Record<RareEventKind, number> = {
  butterfly: 55,
  paperAirplane: 95,
  ladybug: 28,
  firefly: 34,
  leaf: 22,
  star: 26,
};

// Pet states that a rare event should never interrupt
const BUSY_STATES = new Set([
  "sleeping",
  "beingDragged",
  "listening",
  "thinking",
  "speaking",
  "beingPatted",
]);

const SPARKLE_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a24b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
</svg>`;

function normalize(v: Vec2): Vec2 {
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class RareEventController {
  private spawnTimer: ReturnType<typeof setTimeout> | null = null;
  private wanderTimer: ReturnType<typeof setInterval> | null = null;
  private lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
  private velocity: Vec2 = { x: 0, y: 0 };
  private wasChasing = false;

  /** Call once (e.g. from PetRenderer's mount effect) to begin the cycle. */
  start() {
    if (!RARE_EVENTS_ENABLED) return;
    if (this.spawnTimer) return;
    this.scheduleNext();
  }

  stop() {
    if (this.spawnTimer) clearTimeout(this.spawnTimer);
    if (this.wanderTimer) clearInterval(this.wanderTimer);
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.spawnTimer = null;
    this.wanderTimer = null;
    this.lifetimeTimer = null;
  }

  /** Lets the player tap the visitor directly for an instant catch. */
  attemptCatch(id: string) {
    const { rareEvent } = usePetStore.getState();
    if (rareEvent && rareEvent.id === id) this.despawn(true);
  }

  private scheduleNext(delayOverride?: number) {
    const delay =
      delayOverride ??
      MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    this.spawnTimer = setTimeout(() => this.trySpawn(), delay);
  }

  private trySpawn() {
    const { pet } = usePetStore.getState();
    if (BUSY_STATES.has(pet.state)) {
      this.scheduleNext(RETRY_DELAY_MS);
      return;
    }
    this.spawn();
  }

  private spawn() {
    const store = usePetStore.getState();
    const { screenSize, pet } = store;
    const kind =
      RARE_EVENT_KINDS[Math.floor(Math.random() * RARE_EVENT_KINDS.length)];

    // Appear just inside a random screen edge — must stay VISIBLE, not
    // actually off-screen, or Kibo chases something nobody can see.
    const edge = Math.floor(Math.random() * 4);
    const inset = 60; // how far inside the edge it appears
    const maxX = Math.max(inset, screenSize.width - inset);
    const maxY = Math.max(inset, screenSize.height - inset);
    let position: Vec2;
    if (edge === 0) position = { x: inset + Math.random() * (maxX - inset), y: inset };
    else if (edge === 1)
      position = { x: maxX, y: inset + Math.random() * (maxY - inset) };
    else if (edge === 2)
      position = { x: inset + Math.random() * (maxX - inset), y: maxY };
    else position = { x: inset, y: inset + Math.random() * (maxY - inset) };

    const event: RareEventData = {
      id: crypto.randomUUID(),
      kind,
      position,
      spawnedAt: Date.now(),
    };

    // Aim its initial drift roughly toward Kibo
    const dir = normalize({
      x: pet.physics.position.x - position.x,
      y: pet.physics.position.y - position.y,
    });
    const speed = KIND_SPEEDS[kind];
    this.velocity = { x: dir.x * speed, y: dir.y * speed };

    store.setRareEvent(event);
    EventBus.emit("rareEvent:spawn", event);

    // Kibo gives chase — reuses the existing chase animation + movement
    this.wasChasing = true;
    store.setPetStateDirect("chasingCursor");
    store.setTargetPosition(position);

    this.wanderTimer = setInterval(() => this.tick(), WANDER_TICK_MS);
    this.lifetimeTimer = setTimeout(() => this.despawn(false), EVENT_LIFETIME_MS);
  }

  private tick() {
    const store = usePetStore.getState();
    const { rareEvent, screenSize, pet } = store;
    if (!rareEvent) return;

    // Gentle random-walk steering, clamped to a per-kind max speed
    const maxSpeed = KIND_SPEEDS[rareEvent.kind];
    const jitter = maxSpeed * 0.9;
    this.velocity.x += (Math.random() - 0.5) * jitter;
    this.velocity.y += (Math.random() - 0.5) * jitter;
    const mag = Math.hypot(this.velocity.x, this.velocity.y) || 1;
    const clamped = Math.min(mag, maxSpeed);
    this.velocity.x = (this.velocity.x / mag) * clamped;
    this.velocity.y = (this.velocity.y / mag) * clamped;

    const dt = WANDER_TICK_MS / 1000;
    let nextX = rareEvent.position.x + this.velocity.x * dt;
    let nextY = rareEvent.position.y + this.velocity.y * dt;

    // Bounce softly off screen edges — stays fully visible at all times
    const inset = 30;
    const minX = inset;
    const maxX = Math.max(inset, screenSize.width - inset);
    const minY = inset;
    const maxY = Math.max(inset, screenSize.height - inset);
    if (nextX < minX || nextX > maxX) this.velocity.x *= -1;
    if (nextY < minY || nextY > maxY) this.velocity.y *= -1;
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    const nextPos = { x: nextX, y: nextY };
    store.setRareEvent({ ...rareEvent, position: nextPos });

    if (this.wasChasing) {
      store.setTargetPosition(nextPos);
    }

    const dist = distanceBetween(pet.physics.position, nextPos);
    if (dist < CATCH_RADIUS) {
      this.despawn(true);
    }
  }

  private despawn(caught: boolean) {
    const store = usePetStore.getState();
    const event = store.rareEvent;
    if (this.wanderTimer) clearInterval(this.wanderTimer);
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.wanderTimer = null;
    this.lifetimeTimer = null;

    if (event && caught) {
      const { pet } = store;
      store.setEmotions({
        happiness: Math.min(100, pet.emotions.happiness + 12),
        excitement: Math.min(100, pet.emotions.excitement + 18),
      });
      store.touchInteraction();
      this.spawnCatchSparkle(pet.physics.position);
      EventBus.emit("rareEvent:caught", event);
    } else if (event) {
      EventBus.emit("rareEvent:despawned", event);
    }

    store.setRareEvent(null);
    if (this.wasChasing) {
      store.setTargetPosition(null);
      store.setPetStateDirect(store.roamingEnabled ? "happy" : "idle");
    }
    this.wasChasing = false;

    // Line up the next appearance
    this.scheduleNext();
  }

  private spawnCatchSparkle(position: Vec2) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed;
      left: ${position.x + PET_SIZE / 2 - 12}px;
      top: ${position.y - 6}px;
      width: 24px;
      height: 24px;
      z-index: 99999;
      pointer-events: none;
      transition: transform 0.9s ease-out, opacity 0.9s ease-out;
    `;
    el.innerHTML = SPARKLE_SVG;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = "translateY(-40px) scale(1.5) rotate(25deg)";
        el.style.opacity = "0";
      });
    });
    setTimeout(() => el.remove(), 950);
  }
}

export const rareEventController = new RareEventController();
