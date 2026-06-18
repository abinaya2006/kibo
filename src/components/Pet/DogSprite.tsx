import React, { useEffect, useRef, useState } from "react";
import { SpriteAnimator } from "../../services/SpriteAnimator";
import {
  DOG_ANIMATIONS,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  FRAME_SIZE,
  resolveAnimation,
} from "../../services/DogSpriteSheet";
import type { PetState, PetMood } from "../../models/types";
import dogSheet from "../../assets/dog.png";

interface DogSpriteSheetProps {
  state: PetState;
  mood: PetMood;
  facing: "left" | "right";
  scale?: number;
}

// Singleton animator — lives outside component so it persists across renders
const animator = new SpriteAnimator();
Object.entries(DOG_ANIMATIONS).forEach(([name, def]) => {
  animator.register(name, def);
});

export const DogSpriteSheet: React.FC<DogSpriteSheetProps> = ({
  state,
  mood,
  facing,
  scale = 2,
}) => {
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number>();

  // Re-render whenever the animator advances a frame
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

  return (
    <div
      style={{
        width: `${displaySize}px`,
        height: `${displaySize}px`,
        backgroundImage: `url(${dogSheet})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundSize: `${SHEET_WIDTH * scale}px ${SHEET_HEIGHT * scale}px`,
        imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
        transform: `scaleX(${facing === "left" ? -1 : 1})`,
        transformOrigin: "center center",
      }}
    />
  );
};

export default DogSpriteSheet;
