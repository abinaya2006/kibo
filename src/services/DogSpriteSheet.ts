import type { AnimationDef } from "./SpriteAnimator";

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRAME_W = 32;
const FRAME_H = 32;

export const SHEET_WIDTH = 128;
export const SHEET_HEIGHT = 320;
export const FRAME_SIZE = 32;

/**
 * Goldie_v02.png layout  —  4 columns × 10 rows @ 32 px
 *
 * Row 0  — idle upright / hat pose      (4 frames)
 * Row 1  — walking side-on              (4 frames)
 * Row 2  — sleeping / lying flat        (4 frames)
 * Row 3  — sit-down transition          (4 frames)
 * Row 4  — sitting idle                 (4 frames)
 * Row 5  — thinking / hat idle          (4 frames)
 * Row 6  — scratching / grooming        (4 frames)
 * Row 7  — sleeping face (zzz)          (4 frames)
 * Row 8  — running                      (4 frames)
 * Row 9  — walking full body            (4 frames)
 */
function extractFrames(
  startRow: number,
  rowCount: number,
  framesPerRow: number = 4,
): Frame[] {
  const frames: Frame[] = [];
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < framesPerRow; c++) {
      frames.push({
        x: c * FRAME_W,
        y: (startRow + r) * FRAME_H,
        w: FRAME_W,
        h: FRAME_H,
      });
    }
  }
  return frames;
}

export type DogAnimationName =
  | "idle"
  | "walking"
  | "running"
  | "sitting"
  | "sittingIdle"
  | "sleeping"
  | "sleepingIdle"
  | "thinking"
  | "scratching"
  | "speaking"
  | "listening"
  | "happy";

export const DOG_ANIMATIONS: Record<DogAnimationName, AnimationDef> = {
  // Row 0 — upright idle / hat pose
  idle: {
    frames: extractFrames(0, 1),
    fps: 6,
    loop: true,
  },

  // Row 9 — walking full body
  walking: {
    frames: extractFrames(9, 1),
    fps: 10,
    loop: true,
  },

  // Row 8 — running
  running: {
    frames: extractFrames(8, 1),
    fps: 14,
    loop: true,
  },

  // Row 3 — sit-down transition (plays once, then holds sittingIdle)
  sleeping: {
    frames: extractFrames(2, 1).slice(0, 2), // only first 2 frames
    fps: 3,
    loop: true,
  },

  sitting: {
    frames: extractFrames(3, 1).slice(0, 2), // only first 2 frames
    fps: 3,
    loop: true,
  },

  sittingIdle: {
    frames: extractFrames(3, 1).slice(0, 2), // same frames, slower
    fps: 2,
    loop: true,
  },

  // Row 7 — sleeping face (zzz blinking)

  // Row 5 — thinking / hat idle
  thinking: {
    frames: extractFrames(5, 1),
    fps: 6,
    loop: true,
  },

  // Row 6 — scratching / grooming
  scratching: {
    frames: extractFrames(6, 1),
    fps: 8,
    loop: true,
  },

  // Speaking → reuse thinking pose until confirmed animation exists
  speaking: {
    frames: extractFrames(5, 1),
    fps: 8,
    loop: true,
  },

  // Listening → idle upright, attentive
  listening: {
    frames: extractFrames(0, 1),
    fps: 6,
    loop: true,
  },

  // Happy → running burst
  happy: {
    frames: extractFrames(8, 1),
    fps: 14,
    loop: true,
  },
};

// ─── State → Animation resolver ────────────────────────────────────────────────

const STATE_TO_ANIMATION: Record<string, DogAnimationName> = {
  idle: "idle",
  walking: "walking",
  running: "running",
  chasingCursor: "running",
  followingCursor: "walking",
  sleeping: "sleeping",
  sitting: "sittingIdle",
  thinking: "thinking",
  speaking: "speaking",
  listening: "listening",
  happy: "happy",
  curious: "idle",
  beingDragged: "running",
  playing: "running",
  yawning: "sleepingIdle",
  stretching: "scratching",
  scratching: "scratching",
};

export function resolveAnimation(
  state: string,
  context?: {
    energy?: number;
    isTalking?: boolean;
    isFollowingCursor?: boolean;
  },
): DogAnimationName {
  if (state === "sleeping") {
    // Deep sleep vs light sleep
    return (context?.energy ?? 100) < 20 ? "sleepingIdle" : "sleeping";
  }

  if (state === "walking" && context?.isFollowingCursor) {
    return "running";
  }

  return STATE_TO_ANIMATION[state] ?? "idle";
}
