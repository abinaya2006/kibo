import type { CursorData } from "../models/types";
import { usePetStore } from "../state/usePetStore";
import {
  FAST_CURSOR_SPEED,
  DWELL_THRESHOLD,
  PET_SIZE,
} from "../models/PetConfig";

// How long the head-pat animation plays (ms)
const PAT_DURATION_MS = 1200;
// Minimum time between pats
const PAT_COOLDOWN_MS = 800;
// During play, chase cursor even at low speeds if within this distance
const PLAY_CHASE_DISTANCE = 300;
// Minimum cursor speed to trigger chase during play (lower than normal)
const PLAY_CHASE_SPEED = 1;

export class BehaviorController {
  private lastPatTime = 0;
  private patTimeout: ReturnType<typeof setTimeout> | null = null;

  interpretCursorBehavior(cursor: CursorData) {
    const store = usePetStore.getState();
    const { pet, roamingEnabled } = store;

    if (!roamingEnabled) return;

    if (
      pet.state === "beingDragged" ||
      pet.state === "listening" ||
      pet.state === "thinking" ||
      pet.state === "speaking" ||
      pet.state === "beingPatted"   // ← don't interrupt a pat
    ) {
      return;
    }

    const currentEnergy = pet.emotions.energy;

    if (pet.state === "sleeping") {
      if (cursor.isNearby && cursor.distanceToPet < 40 && currentEnergy > 30) {
        store.setPetStateDirect("idle");
      }
      return;
    }

    // ── PLAY MODE: aggressive cursor chasing ──────────────────────────────────
    // During a play session (roamingEnabled), chase cursor whenever it moves
    // at any speed, as long as it's within PLAY_CHASE_DISTANCE pixels.
    if (
      roamingEnabled &&
      cursor.distanceToPet < PLAY_CHASE_DISTANCE &&
      cursor.speed > PLAY_CHASE_SPEED
    ) {
      if (pet.state !== "chasingCursor") {
        store.setPetStateDirect("chasingCursor");
      }
      // Target slightly behind cursor so the cat "chases" rather than teleports
      const targetPos = {
        x: cursor.position.x - PET_SIZE / 2,
        y: cursor.position.y - PET_SIZE / 2,
      };
      store.setTargetPosition(targetPos);
      store.touchInteraction();
      return;
    }

    // ── NORMAL: high-speed chase ───────────────────────────────────────────────
    if (cursor.isNearby && cursor.speed > FAST_CURSOR_SPEED) {
      if (pet.state !== "chasingCursor") {
        store.setPetStateDirect("chasingCursor");
      }
      store.setTargetPosition({
        x: cursor.position.x - PET_SIZE / 2,
        y: cursor.position.y - PET_SIZE / 2,
      });
      store.touchInteraction();
      return;
    }

    // ── Circling Excitement ───────────────────────────────────────────────────
    if (cursor.isNearby && cursor.isCircling) {
      if (pet.state !== "happy") {
        store.setPetStateDirect("happy");
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
      store.touchInteraction();
      return;
    }

    // ── Dwell / Curiosity ─────────────────────────────────────────────────────
    if (cursor.isNearby) {
      if (cursor.dwellTime > DWELL_THRESHOLD) {
        if (pet.state !== "followingCursor") {
          store.setPetStateDirect("followingCursor");
        }
        store.setTargetPosition({
          x: cursor.position.x - PET_SIZE / 2,
          y: cursor.position.y - PET_SIZE / 2,
        });
      } else {
        if (pet.state === "idle" || pet.state === "walking") {
          store.setPetStateDirect("curious");
          store.setTargetPosition(null);
          store.setVelocity({ x: 0, y: 0 });
        }
      }
      return;
    }

    // ── Cursor Left ───────────────────────────────────────────────────────────
    if (!cursor.isNearby) {
      if (
        pet.state === "followingCursor" ||
        pet.state === "chasingCursor" ||
        pet.state === "curious"
      ) {
        store.setPetStateDirect("idle");
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
    }
  }

  handlePetClick() {
    const store = usePetStore.getState();
    const { pet, roamingEnabled } = store;

    if (pet.state === "sleeping") {
      store.setPetStateDirect("idle");
      store.touchInteraction();
      return;
    }

    // During play mode → trigger head-pat animation
    if (roamingEnabled) {
      this._triggerPat(store);
      return;
    }

    // Normal click → happy
    store.setPetStateDirect("happy");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
    store.touchInteraction();
  }

  handlePetPat() {
    const now = Date.now();
    if (now - this.lastPatTime < PAT_COOLDOWN_MS) return;

    const store = usePetStore.getState();
    this._triggerPat(store);
  }

  private _triggerPat(store: ReturnType<typeof usePetStore.getState>) {
    const now = Date.now();
    if (now - this.lastPatTime < PAT_COOLDOWN_MS) return;
    this.lastPatTime = now;

    // Clear any pending pat reset
    if (this.patTimeout) {
      clearTimeout(this.patTimeout);
      this.patTimeout = null;
    }

    // Stop movement, play pat animation
    store.setPetStateDirect("beingPatted");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
    store.touchInteraction();

    // Boost happiness a little each pat
    const { pet } = store;
    store.setEmotions({
      happiness: Math.min(100, pet.emotions.happiness + 5),
    });

    // Spawn heart particle above the pet
    this._spawnHeartParticle(pet.physics.position);

    // Return to idle/play after animation
    this.patTimeout = setTimeout(() => {
      const s = usePetStore.getState();
      if (s.pet.state === "beingPatted") {
        // If still in play session go happy, else idle
        s.setPetStateDirect(s.roamingEnabled ? "happy" : "idle");
      }
      this.patTimeout = null;
    }, PAT_DURATION_MS);
  }

  private _spawnHeartParticle(position: { x: number; y: number }) {
    const hearts = ["💕", "💖", "✨", "⭐"];
    const emoji = hearts[Math.floor(Math.random() * hearts.length)];
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.cssText = `
      position: fixed;
      font-size: 1.4rem;
      z-index: 99999;
      pointer-events: none;
      left: ${position.x + 10 + (Math.random() - 0.5) * 20}px;
      top: ${position.y}px;
      transition: transform 1s ease-out, opacity 1s ease-out;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translateY(-50px) scale(1.4)`;
        el.style.opacity = "0";
      });
    });
    setTimeout(() => el.remove(), 1100);
  }
}