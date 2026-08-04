import React from "react";
import { usePetStore } from "../../state/usePetStore";
import { rareEventController } from "../../controllers/RareEventController";
import type { RareEventKind } from "../../models/types";

/* Hand-drawn ink-line visitors, matching the parchment/Ghibli theme —
   no emojis, small touches of muted natural color per creature. */

const iconProps = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

const ButterflyIcon = () => (
  <svg {...iconProps}>
    <path d="M12 6c-1-2.5-4-3.5-6-2-2 1.5-2 4.5.5 6 1.5.9 3.5 1 5.5-.3" stroke="#b98aa0" />
    <path d="M12 6c1-2.5 4-3.5 6-2 2 1.5 2 4.5-.5 6-1.5.9-3.5 1-5.5-.3" stroke="#b98aa0" />
    <path d="M12 8c-1 2.6-4 3.6-5.8 2.3-1.8-1.3-1.6-4.1.7-5.6 1.4-.9 3.4-.8 5.1.4" stroke="#8ea8c9" opacity="0.85" />
    <path d="M12 8c1 2.6 4 3.6 5.8 2.3 1.8-1.3 1.6-4.1-.7-5.6-1.4-.9-3.4-.8-5.1.4" stroke="#8ea8c9" opacity="0.85" />
    <path d="M12 5.5v11" stroke="#3a3226" />
  </svg>
);

const PaperAirplaneIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12 20 4l-6.5 16-2.5-6.5L3 12Z" stroke="#3a3226" />
    <path d="M11 13.5 20 4" stroke="#8a7a63" />
  </svg>
);

const LadybugIcon = () => (
  <svg {...iconProps}>
    <path d="M12 6.5c3.6 0 6 2.6 6 6.3S15.6 19 12 19s-6-2.6-6-6.2 2.4-6.3 6-6.3Z" stroke="#a8543f" />
    <path d="M12 6.5v12.5M7 10.5c1.6.9 3.4 1 5 1s3.4-.1 5-1" stroke="#3a3226" />
    <circle cx="9.3" cy="14" r="0.9" fill="#3a3226" stroke="none" />
    <circle cx="14.7" cy="14" r="0.9" fill="#3a3226" stroke="none" />
    <circle cx="9.8" cy="10.2" r="0.7" fill="#3a3226" stroke="none" />
    <path d="M9 6c-1.4-1.2-3-1.4-4-1M15 6c1.4-1.2 3-1.4 4-1" stroke="#3a3226" />
  </svg>
);

const FireflyIcon = () => (
  <svg {...iconProps} style={{ filter: "drop-shadow(0 0 4px rgba(226,186,90,0.85))" }}>
    <circle cx="11" cy="12" r="3.4" stroke="#6b5c47" />
    <circle cx="14.3" cy="12.6" r="1.6" fill="#e2ba5a" stroke="none" />
    <path d="M8.8 9.3c-1-1-2.2-1.2-3-.9M8.8 14.7c-1 1-2.2 1.2-3 .9" stroke="#6b5c47" />
  </svg>
);

const LeafIcon = () => (
  <svg {...iconProps}>
    <path d="M6 18c-1-6 2-11.5 12-13-.6 8.6-5.5 12.2-12 13Z" stroke="#6f8a5c" />
    <path d="M7.3 17c3-3.4 5.6-6.6 9-11.4" stroke="#4f6a41" />
  </svg>
);

const StarIcon = () => (
  <svg {...iconProps} style={{ filter: "drop-shadow(0 0 3px rgba(226,186,90,0.65))" }}>
    <path
      d="M12 4.5 13.7 9.8 19.2 9.9 14.8 13.2 16.4 18.5 12 15.3 7.6 18.5 9.2 13.2 4.8 9.9 10.3 9.8Z"
      stroke="#c9a24b"
    />
  </svg>
);

const ICONS: Record<RareEventKind, React.FC> = {
  butterfly: ButterflyIcon,
  paperAirplane: PaperAirplaneIcon,
  ladybug: LadybugIcon,
  firefly: FireflyIcon,
  leaf: LeafIcon,
  star: StarIcon,
};

const DRIFT_KEYFRAMES = `
@keyframes rareEventFlutter {
  0%   { transform: translate(-50%, -50%) rotate(-6deg) scale(1); }
  50%  { transform: translate(-50%, -50%) rotate(6deg) scale(1.05); }
  100% { transform: translate(-50%, -50%) rotate(-6deg) scale(1); }
}`;

export const RareEventSprite: React.FC = () => {
  const rareEvent = usePetStore((s) => s.rareEvent);

  if (!rareEvent) return null;
  const Icon = ICONS[rareEvent.kind];

  return (
    <>
      <style>{DRIFT_KEYFRAMES}</style>
      <div
        onClick={() => rareEventController.attemptCatch(rareEvent.id)}
        onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
        onMouseLeave={() => window.electronAPI?.setIgnoreMouseEvents(true)}
        style={{
          position: "fixed",
          left: `${rareEvent.position.x}px`,
          top: `${rareEvent.position.y}px`,
          animation: "rareEventFlutter 1.1s ease-in-out infinite",
          cursor: "pointer",
          zIndex: 1500,
          pointerEvents: "auto",
        }}
        title="A rare visitor — give chase!"
      >
        <Icon />
      </div>
    </>
  );
};
