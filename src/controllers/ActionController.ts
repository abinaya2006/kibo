import { usePetStore } from "../state/usePetStore";

// ─── Play Session State ────────────────────────────────────────────────────────
let playSessionTimer: ReturnType<typeof setTimeout> | null = null;
let playActivityTimer: ReturnType<typeof setTimeout> | null = null;

const PLAY_DURATION_MS = 20000; // 20 seconds of play

// Activities weighted toward chasing and movement
// "chasingCursor" appears most — BehaviorController will drive it reactively
// "running" makes the cat dart around the screen energetically
const playActivities = [
  "chasingCursor",
  "chasingCursor",
  "happy",
  "running",
  "chasingCursor",
  "walking",
  "chasingCursor",
  "happy",
  "running",
  "chasingCursor",
] as const;

function runPlayActivity(index: number) {
  const store = usePetStore.getState();
  const { screenSize, pet } = store;

  const activity = playActivities[index % playActivities.length];

  if (activity === "chasingCursor") {
    // Let BehaviorController handle actual cursor chasing
    // We set the state as a hint; movement is driven by cursor events
    // But also give it a random dart target so it moves even without cursor
    const cx = pet.physics.position.x;
    const cy = pet.physics.position.y;
    store.setPetStateDirect("chasingCursor");
    store.setTargetPosition({
      x: Math.max(40, Math.min(screenSize.width - 80, cx + (Math.random() - 0.5) * 400)),
      y: Math.max(40, Math.min(screenSize.height - 80, cy + (Math.random() - 0.5) * 300)),
    });
  } else if (activity === "running") {
    // Dart to a random spot quickly
    store.setPetStateDirect("running");
    store.setTargetPosition({
      x: Math.max(40, Math.min(screenSize.width - 80, Math.random() * (screenSize.width - 120) + 40)),
      y: Math.max(40, Math.min(screenSize.height - 80, Math.random() * (screenSize.height - 120) + 40)),
    });
  } else if (activity === "walking") {
    const cx = pet.physics.position.x;
    const cy = pet.physics.position.y;
    store.setPetStateDirect("walking");
    store.setTargetPosition({
      x: Math.max(40, Math.min(screenSize.width - 80, cx + (Math.random() - 0.5) * 250)),
      y: Math.max(40, Math.min(screenSize.height - 80, cy + (Math.random() - 0.5) * 200)),
    });
  } else {
    // happy — spin / bounce in place
    store.setPetStateDirect(activity);
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
  }

  // Shorter interval for snappier play feel
  playActivityTimer = setTimeout(() => runPlayActivity(index + 1), 2000);
}

function endPlaySession() {
  if (playActivityTimer) clearTimeout(playActivityTimer);
  if (playSessionTimer) clearTimeout(playSessionTimer);
  playActivityTimer = null;
  playSessionTimer = null;

  const store = usePetStore.getState();
  store.setRoamingEnabled(false);
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

    store.setPetStateDirect("happy");

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

    store.setRoamingEnabled(true);

    store.setEmotions({
      happiness: Math.min(100, pet.emotions.happiness + 20),
      excitement: Math.min(100, pet.emotions.excitement + 30),
      energy: Math.max(0, pet.emotions.energy - 15),
      boredom: Math.max(0, pet.emotions.boredom - 20),
    });
    store.setRelationship(pet.relationship + 5);
    store.touchInteraction();

    // Kick off with a burst of excitement
    store.setPetStateDirect("happy");
    setTimeout(() => runPlayActivity(0), 600);

    playSessionTimer = setTimeout(endPlaySession, PLAY_DURATION_MS);
  },

  wake() {
    endPlaySession();
    const store = usePetStore.getState();
    const { pet } = store;

    store.setPetStateDirect("idle");

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

    ActionController._spawnFoodParticle(food.emoji);

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

    const store = usePetStore.getState();
    const { position } = store.pet.physics;
    el.style.left = `${position.x + 20}px`;
    el.style.top = `${position.y + 10}px`;

    document.body.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = "translateY(-60px) scale(1.3)";
        el.style.opacity = "0";
      });
    });

    setTimeout(() => el.remove(), 1300);
  },
};