import React, { useEffect, useRef, useState } from "react";
import { SpriteAnimator } from "../../services/SpriteAnimator";
import {
  CAT_ANIMATIONS,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  FRAME_SIZE,
  resolveAnimation,
} from "../../services/CatSpriteSheet";
import type { PetState, PetMood } from "../../models/types";
import catSheet from "../../assets/Cat-Sheet.png";

interface CatSpriteSheetProps {
  state: PetState;
  mood: PetMood;
  facing: "left" | "right";
  scale?: number;
}

// Singleton animator — lives outside component so it persists
const animator = new SpriteAnimator();
Object.entries(CAT_ANIMATIONS).forEach(([name, def]) => {
  animator.register(name, def);
});

export const CatSpriteSheet: React.FC<CatSpriteSheetProps> = ({
  state,
  mood,
  facing,
  scale = 2,
}) => {
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number>();

  // Re-render when animator advances a frame
  useEffect(() => {
    const unsub = animator.onFrame(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = (now: number) => {
      animator.update(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Switch animation when pet state changes
  useEffect(() => {
    const anim = resolveAnimation(state, {
      isTalking: state === "speaking",
      isFollowingCursor: state === "followingCursor",
    });
    animator.play(anim);
  }, [state]);

  const frame = animator.getCurrentFrame();
  if (!frame) return null;

  const displaySize = FRAME_SIZE * scale;
  const isBeingPatted = state === "beingPatted";

  return (
    <div
      style={{
        width: `${displaySize}px`,
        height: `${displaySize}px`,
        animation: isBeingPatted ? "petPatBob 0.15s ease-in-out" : undefined,
        transform: `scaleX(${facing === "left" ? -1 : 1}) ${isBeingPatted ? "scaleY(0.92)" : ""}`,
        transformOrigin: "center bottom",
        transition: isBeingPatted ? "none" : "transform 0.1s ease-out",
      }}
    >
      <style>{`
        @keyframes petPatBob {
          0%   { transform: scaleX(${facing === "left" ? -1 : 1}) scaleY(1)    translateY(0px); }
          30%  { transform: scaleX(${facing === "left" ? -1 : 1}) scaleY(0.88) translateY(3px); }
          60%  { transform: scaleX(${facing === "left" ? -1 : 1}) scaleY(1.05) translateY(-2px); }
          100% { transform: scaleX(${facing === "left" ? -1 : 1}) scaleY(1)    translateY(0px); }
        }
      `}</style>
      <div
        style={{
          width: `${displaySize}px`,
          height: `${displaySize}px`,
          backgroundImage: `url(${catSheet})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
          backgroundSize: `${SHEET_WIDTH * scale}px ${SHEET_HEIGHT * scale}px`,
          imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
        }}
      />
    </div>
  );
};

export default CatSpriteSheet;