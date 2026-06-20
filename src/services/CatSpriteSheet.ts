import type { AnimationDef } from "./SpriteAnimator";

interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRAME_W = 32;
const FRAME_H = 32;

export const SHEET_WIDTH = 256;
export const SHEET_HEIGHT = 1632;
export const FRAME_SIZE = 32;

function extractFrames(
  startRow: number,
  rowCount: number,
  framesPerRow: number,
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

export type AnimationName =
  | "idle"
  | "walking"
  | "running"
  | "runStop"
  | "sitting"
  | "sleeping"
  | "sleepingIdle"
  | "waking"
  | "jumpStart"
  | "jumpMid"
  | "jumpLand"
  | "happy"
  | "thinking"
  | "speaking"
  | "listening";

export const CAT_ANIMATIONS: Record<AnimationName, AnimationDef> = {
  // rows 0–2 — idle (3 rows x 8 frames)
  idle: {
    frames: extractFrames(0, 3, 8),
    fps: 8,
    loop: true,
  },

  // row 3 — walking
  walking: {
    frames: extractFrames(3, 1, 8),
    fps: 10,
    loop: true,
  },

  // row 5 — running
  running: {
    frames: extractFrames(5, 1, 8),
    fps: 14,
    loop: true,
  },

  // row 7 — run to halt
  runStop: {
    frames: extractFrames(7, 1, 8),
    fps: 12,
    loop: false,
  },

  // row 10 — sit
  sitting: {
    frames: extractFrames(10, 1, 8),
    fps: 4,
    loop: true,
  },

  // rows 11–12 — sleeping
  // row 12 (visual) = index 11 — sleeping, 8 frames
  sleeping: {
    frames: extractFrames(11, 1, 8),
    fps: 4,
    loop: true,
  },

  // rows 15–16 — waking up
  waking: {
    frames: extractFrames(15, 2, 8),
    fps: 10,
    loop: false,
  },

  // row 18 — jump start
  jumpStart: {
    frames: extractFrames(18, 1, 8),
    fps: 12,
    loop: false,
  },

  // row 19 — jump midair
  jumpMid: {
    frames: extractFrames(19, 1, 8),
    fps: 10,
    loop: true,
  },

  // row 20 — jump land
  jumpLand: {
    frames: extractFrames(20, 1, 8),
    fps: 12,
    loop: false,
  },

  // emotional fallbacks — idle until confirmed
  happy: {
    frames: extractFrames(0, 1, 8),
    fps: 10,
    loop: true,
  },

  thinking: {
    frames: extractFrames(0, 1, 8),
    fps: 6,
    loop: true,
  },

  speaking: {
    frames: extractFrames(0, 1, 8),
    fps: 8,
    loop: true,
  },

  listening: {
    frames: extractFrames(0, 1, 8),
    fps: 8,
    loop: true,
  },
};

// ─── State Resolver ────────────────────────────────────────────────────────────

const STATE_TO_ANIMATION: Record<string, AnimationName> = {
  idle: "idle",
  walking: "walking",
  running: "running",
  chasingCursor: "running",
  followingCursor: "walking",
  sleeping: "sleeping",
  sitting: "sitting",
  thinking: "thinking",
  speaking: "speaking",
  listening: "listening",
  happy: "happy",
  curious: "idle",
  beingDragged: "running",
  playing: "running",
  yawning: "sleeping", // ← changed from 'sleepingIdle'
  stretches: "sitting",
};

export function resolveAnimation(
  state: string,
  context?: {
    energy?: number;
    isTalking?: boolean;
    isFollowingCursor?: boolean;
  },
): AnimationName {
  if (state === "sleeping") {
    return "sleeping"; // always use sleeping, never sleepingIdle
  }
  if (state === "walking" && context?.isFollowingCursor) {
    return "running";
  }
  return STATE_TO_ANIMATION[state] ?? "idle";
}
