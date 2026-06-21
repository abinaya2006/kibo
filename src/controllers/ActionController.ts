import { usePetStore } from "../state/usePetStore";

// ─── Play Session State ────────────────────────────────────────────────────────
let playSessionTimer: ReturnType<typeof setTimeout> | null = null;
let playActivityTimer: ReturnType<typeof setTimeout> | null = null;

const PLAY_DURATION_MS = 15000; // 15 seconds of play

const playActivities = [
  "followingCursor",
  "chasingCursor",
  "happy",
  "walking",
  "chasingCursor",
  "happy",
] as const;

function runPlayActivity(index: number) {
  const store = usePetStore.getState();
  const { screenSize, pet } = store;

  const activity = playActivities[index % playActivities.length];

  if (activity === "followingCursor" || activity === "chasingCursor") {
    // Don't force state — let BehaviorController drive it via cursor events
    // Just ensure roamingEnabled stays true (already true during play)
  } else if (activity === "walking") {
    store.setPetStateDirect(activity);
    const cx = pet.physics.position.x;
    const cy = pet.physics.position.y;
    store.setTargetPosition({
      x: Math.max(
        40,
        Math.min(screenSize.width - 80, cx + (Math.random() - 0.5) * 300),
      ),
      y: Math.max(
        40,
        Math.min(screenSize.height - 80, cy + (Math.random() - 0.5) * 200),
      ),
    });
  } else {
    store.setPetStateDirect(activity);
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
  }

  playActivityTimer = setTimeout(() => runPlayActivity(index + 1), 2500);
}

function endPlaySession() {
  if (playActivityTimer) clearTimeout(playActivityTimer);
  if (playSessionTimer) clearTimeout(playSessionTimer);
  playActivityTimer = null;
  playSessionTimer = null;

  const store = usePetStore.getState();
  store.setRoamingEnabled(false); // ← stop autonomous movement
  store.setPetStateDirect("idle");
  store.setTargetPosition(null);
  store.setVelocity({ x: 0, y: 0 });
}
// ─── Action Controller ─────────────────────────────────────────────────────────

export const ActionController = {
  feed() {
    const store = usePetStore.getState();
    const { pet } = store;

    store.setEmotions({
      hunger: Math.min(100, pet.emotions.hunger + 30),
      happiness: Math.min(100, pet.emotions.happiness + 10),
    });
    store.setRelationship(pet.relationship + 2);
    store.touchInteraction();

    // Use 'happy' — it exists and shows a reaction
    store.setPetStateDirect("happy");

    // Return to idle after 2s
    setTimeout(() => {
      const s = usePetStore.getState();
      if (s.pet.state === "happy") {
        s.setPetStateDirect("idle");
      }
    }, 2000);
  },

  sleep() {
    endPlaySession();
    const store = usePetStore.getState();
    store.setPetStateDirect("sleeping");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
  },

  play() {
    endPlaySession();

    const store = usePetStore.getState();
    const { pet } = store;

    store.setRoamingEnabled(true); // ← allow movement during play

    store.setEmotions({
      happiness: Math.min(100, pet.emotions.happiness + 20),
      excitement: Math.min(100, pet.emotions.excitement + 30),
      energy: Math.max(0, pet.emotions.energy - 15),
      boredom: Math.max(0, pet.emotions.boredom - 20),
    });
    store.setRelationship(pet.relationship + 5);
    store.touchInteraction();

    runPlayActivity(0);

    playSessionTimer = setTimeout(endPlaySession, PLAY_DURATION_MS);
  },

  wake() {
    endPlaySession();
    const store = usePetStore.getState();
    const { pet } = store;

    store.setPetStateDirect("idle");

    // Only restore energy if pet was actually sleeping (don't free-give energy otherwise)
    if (pet.state === "sleeping") {
      store.setEmotions({ energy: Math.min(100, pet.emotions.energy + 40) });
    }

    store.touchInteraction();
  },

  meditate() {
    endPlaySession();
    const store = usePetStore.getState();
    store.setPetStateDirect("thinking");
    store.touchInteraction();
  },

  feedWithFood(food: {
    emoji: string;
    label: string;
    hunger: number;
    happiness: number;
  }) {
    const store = usePetStore.getState();
    const { pet } = store;

    store.setEmotions({
      hunger: Math.min(100, pet.emotions.hunger + food.hunger),
      happiness: Math.min(100, pet.emotions.happiness + food.happiness),
      boredom: Math.max(0, pet.emotions.boredom - 10),
    });
    store.setRelationship(pet.relationship + 2);
    store.touchInteraction();
    store.setPetStateDirect("happy");

    // Float the food emoji above the pet
    ActionController._spawnFoodParticle(food.emoji);

    // Return to idle after reaction
    setTimeout(() => {
      const s = usePetStore.getState();
      if (s.pet.state === "happy") s.setPetStateDirect("idle");
    }, 2500);
  },

  _spawnFoodParticle(emoji: string) {
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.cssText = `
      position: fixed;
      font-size: 2rem;
      z-index: 99999;
      pointer-events: none;
      transition: transform 1.2s ease-out, opacity 1.2s ease-out;
    `;

    // Position near the pet
    const store = usePetStore.getState();
    const { position } = store.pet.physics;
    el.style.left = `${position.x + 20}px`;
    el.style.top = `${position.y + 10}px`;

    document.body.appendChild(el);

    // Animate upward and fade
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = "translateY(-60px) scale(1.3)";
        el.style.opacity = "0";
      });
    });

    setTimeout(() => el.remove(), 1300);
  },
};
