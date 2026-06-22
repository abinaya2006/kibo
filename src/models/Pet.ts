import type { PetData, PetState, PetEmotions, PetMood, Vec2 } from "./types";

// ─── FSM Transition Rules ──────────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<PetState, ReadonlyArray<PetState>> = {
  idle: [
    "walking",
    "sleeping",
    "curious",
    "happy",
    "followingCursor",
    "beingDragged",
    "eating",
    "yawning",
    "stretches",
    "listening",
    "thinking",
    "beingPatted",
  ],
  walking: [
    "idle",
    "running",
    "followingCursor",
    "chasingCursor",
    "beingDragged",
    "curious",
    "beingPatted",
  ],
  running: ["walking", "idle", "chasingCursor", "beingDragged", "beingPatted"],
  sleeping: ["idle"],
  playing: [
    "idle",
    "happy",
    "followingCursor",
    "chasingCursor",
    "beingDragged",
    "beingPatted",
  ],
  followingCursor: [
    "idle",
    "walking",
    "playing",
    "happy",
    "beingDragged",
    "chasingCursor",
    "curious",
    "beingPatted",
  ],
  chasingCursor: [
    "followingCursor",
    "idle",
    "walking",
    "happy",
    "beingDragged",
    "playing",
    "beingPatted",
  ],
  beingDragged: ["idle", "happy"],
  happy: [
    "idle",
    "walking",
    "playing",
    "followingCursor",
    "beingDragged",
    "beingPatted",
    "chasingCursor",
  ],
  curious: [
    "idle",
    "followingCursor",
    "walking",
    "happy",
    "beingDragged",
    "listening",
    "beingPatted",
  ],
  eating: ["idle", "happy"],
  thinking: ["idle", "happy", "curious", "speaking"],
  yawning: ["idle", "sleeping"],
  stretches: ["idle", "walking"],
  listening: ["thinking", "idle"],
  speaking: ["idle", "listening", "thinking"],
  // beingPatted can return to happy (during play) or idle (outside play)
  beingPatted: ["happy", "idle", "chasingCursor", "walking"],
};

// ─── Speed Settings ────────────────────────────────────────────────────────────

export const SPEED_PRESETS: Record<PetState, number> = {
  idle: 0,
  walking: 60,
  running: 200,          // faster dart during play
  followingCursor: 80,
  chasingCursor: 240,    // snappier chase
  sleeping: 0,
  playing: 100,
  happy: 0,
  curious: 0,
  beingDragged: 0,
  eating: 0,
  thinking: 0,
  yawning: 0,
  stretches: 0,
  listening: 0,
  speaking: 0,
  beingPatted: 0,        // frozen while being patted
};

export function canTransition(from: PetState, to: PetState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function computeMood(emotions: PetEmotions): PetMood {
  const { happiness, energy, excitement, boredom, hunger } = emotions;
  if (hunger < 30) return "hungry";
  if (energy < 12) return "sleepy";
  if (excitement > 70) return "excited";
  if (happiness > 70) return "happy";
  if (boredom > 70) return "bored";
  if (happiness < 30) return "sad";
  if (excitement > 40) return "curious";
  return "neutral";
}

export function createDefaultPet(overrides?: Partial<PetData>): PetData {
  const sw = typeof window !== "undefined" ? window.screen.availWidth : 1920;
  const sh = typeof window !== "undefined" ? window.screen.availHeight : 1080;
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Luna",
    species: "cat",
    level: 1,
    experience: 0,
    relationship: 0,
    personality: "playful",
    state: "idle",
    mood: "happy",
    emotions: {
      happiness: 80,
      energy: 80,
      hunger: 80,
      social: 80,
      excitement: 20,
      boredom: 10,
    },
    physics: {
      position: { x: sw / 2 - 50, y: sh / 2 - 60 },
      velocity: { x: 0, y: 0 },
      targetPosition: null,
      speed: 0,
      facing: "right",
    },
    lastInteraction: now,
    createdAt: now,
    ...overrides,
  };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}