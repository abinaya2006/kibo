import React, { useState } from "react";
import { usePetStore } from "../../state/usePetStore";
// SPECIES_CONFIGS unused now that "change companion" is disabled
// import { SPECIES_CONFIGS } from "../../models/PetConfig";
import { ActionController } from "../../controllers/ActionController";

interface PetContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Hand-drawn line icons (ink-on-parchment style, no emoji fonts)      */
/* ------------------------------------------------------------------ */

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MoonIcon = () => (
  <svg {...iconProps}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
  </svg>
);

const SunIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5M18.1 18.1l-1.5-1.5M7.4 7.4 5.9 5.9" />
  </svg>
);

const YarnIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M5 9.5c3 1.4 5 1.4 8-.3M4.7 14c4 .8 8.5.6 12.6-1.6M7 18c4-.4 8-2 10-4.4" />
  </svg>
);

const FishIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12c3-4 8-6 12-4.5 2 .8 3.5 2.4 4.5 4.5-1 2.1-2.5 3.7-4.5 4.5-4 1.5-9-.5-12-4.5Z" />
    <path d="M19.5 12 22 9M19.5 12 22 15" />
    <circle cx="8.3" cy="11" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const DrumstickIcon = () => (
  <svg {...iconProps}>
    <path d="M14.5 13.5c-2 2-4.8 3.4-7 3.9-1.1.2-2-.7-1.8-1.8.5-2.2 1.9-5 3.9-7 2.3-2.3 5.4-3 6.9-1.5s.8 4.6-1.5 6.9c-.2.2-.3.3-.5.5Z" />
    <path d="M14 14 19.5 19.5M17 11.5c1.6-1.6 2.2-3.6 1.3-4.5" />
  </svg>
);

const MilkIcon = () => (
  <svg {...iconProps}>
    <path d="M9.5 3h5l.7 3.2c.9.9 1.3 1.7 1.3 3v9.8a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9.2c0-1.3.4-2.1 1.3-3L9.5 3Z" />
    <path d="M8.5 13h7M9.5 3h5" />
  </svg>
);

const BowlIcon = () => (
  <svg {...iconProps}>
    <path d="M4 12h16c0 3.5-3.6 6.3-8 6.3S4 15.5 4 12Z" />
    <path d="M6.5 12c.2-2 1.8-3.4 3.5-3.7M12 7.7c1.8 0 3.3 1.7 3.6 3.6" />
  </svg>
);

const GearIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
  </svg>
);

const DoorIcon = () => (
  <svg {...iconProps}>
    <path d="M6 3.5h9v17H6z" />
    <path d="M6 3.5 4 4.8v14.4l2 1.3M12.3 12v.1" />
    <path d="M17 8.5 20 12l-3 3.5" />
  </svg>
);

const TwigCrossIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M6 6 18 18M18 6 6 18" />
  </svg>
);

const LeafArrowIcon = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M6 4c6 1.5 10 4.6 12 8-2 3.4-6 6.5-12 8 2-3.6 3-5.4 3-8s-1-4.4-3-8Z" />
  </svg>
);

/* ------------------------------------------------------------------ */

const FOOD_ITEMS = [
  { icon: DrumstickIcon, label: "Meat", hunger: 40, happiness: 15 },
  { icon: FishIcon, label: "Fish", hunger: 35, happiness: 20 },
  { icon: MilkIcon, label: "Milk", hunger: 10, happiness: 12 },
];

/* Ghibli-inspired palette: parchment, ink, moss, and warm candlelight */
const ink = "#3a3226";
const inkSoft = "#8a7a63";
const inkFaint = "rgba(91,74,58,0.16)";
const parchment = "linear-gradient(160deg, #f8f1dd 0%, #ede1c3 100%)";
const candlelight = "rgba(214,176,111,0.32)";
const candlelightSoft = "rgba(214,176,111,0.18)";
const rust = "#a85a41";

export const PetContextMenu: React.FC<PetContextMenuProps> = ({
  x,
  y,
  onClose,
}) => {
  const store = usePetStore();
  const { pet } = store;
  const [showFoodPicker, setShowFoodPicker] = useState(false);

  const handleFeed = (food: (typeof FOOD_ITEMS)[number]) => {
    ActionController.feedWithFood(food);
    onClose();
  };

  const handleInteract = (action: "sleep" | "wake" | "play" | "think") => {
    if (action === "sleep") ActionController.sleep();
    else if (action === "wake") ActionController.wake();
    else if (action === "play") ActionController.play();
    else if (action === "think") ActionController.meditate();
    onClose();
  };

  const onEnterHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = candlelight;
  };
  const onLeaveHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
  };

  return (
    <div
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        background: parchment,
        border: `1px solid ${inkFaint}`,
        boxShadow:
          "0 14px 30px rgba(58,50,38,0.20), 0 2px 6px rgba(58,50,38,0.12)",
        borderRadius: "14px 16px 14px 16px",
        padding: "10px",
        zIndex: 9999,
        minWidth: "170px",
        fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif",
        fontSize: "0.85rem",
        color: ink,
        pointerEvents: "auto",
      }}
    >
      {/* Name header */}
      <div
        style={{
          padding: "6px 8px",
          borderBottom: `1px solid ${inkFaint}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ fontSize: "0.95rem", letterSpacing: "0.2px" }}>
            {pet.name}
          </strong>
        </div>
        <div style={{ fontSize: "0.7rem", color: inkSoft, marginTop: "2px" }}>
          Mood:{" "}
          <span style={{ fontWeight: 600 }}>{pet.mood.toUpperCase()}</span>
          {" · "}
          Hunger:{" "}
          <span style={{ fontWeight: 600 }}>
            {Math.round(pet.emotions.hunger)}
          </span>
        </div>
      </div>

      {/* Food picker panel */}
      {showFoodPicker ? (
        <div>
          <div
            style={{
              padding: "6px 8px 4px",
              fontSize: "0.68rem",
              letterSpacing: "0.5px",
              color: inkSoft,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>CHOOSE FOOD</span>
            <button
              onClick={() => setShowFoodPicker(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: inkSoft,
                padding: 2,
                display: "flex",
              }}
            >
              <TwigCrossIcon />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5px",
              padding: "2px 0",
            }}
          >
            {FOOD_ITEMS.map((food) => {
              const Icon = food.icon;
              return (
                <button
                  key={food.label}
                  onClick={() => handleFeed(food)}
                  style={{
                    background: candlelightSoft,
                    border: `1px solid ${inkFaint}`,
                    borderRadius: "10px",
                    padding: "8px 4px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "inherit",
                    color: ink,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = candlelight)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = candlelightSoft)
                  }
                >
                  <span style={{ display: "flex" }}>
                    <Icon />
                  </span>
                  <span style={{ fontSize: "0.68rem", color: inkSoft }}>
                    {food.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            marginTop: "6px",
          }}
        >
          {pet.state === "sleeping" ? (
            <button
              style={menuItemStyle}
              onClick={() => handleInteract("wake")}
              onMouseEnter={onEnterHover}
              onMouseLeave={onLeaveHover}
            >
              <SunIcon /> Wake Up
            </button>
          ) : (
            <>
              <button
                style={menuItemStyle}
                onClick={() => handleInteract("sleep")}
                onMouseEnter={onEnterHover}
                onMouseLeave={onLeaveHover}
              >
                <MoonIcon /> Put to Sleep
              </button>
              <button
                style={menuItemStyle}
                onClick={() => handleInteract("play")}
                onMouseEnter={onEnterHover}
                onMouseLeave={onLeaveHover}
              >
                <YarnIcon /> Play
              </button>
              <button
                style={menuItemStyle}
                onClick={() => setShowFoodPicker(true)}
                onMouseEnter={onEnterHover}
                onMouseLeave={onLeaveHover}
              >
                <BowlIcon /> Feed
                <span
                  style={{
                    marginLeft: "auto",
                    color: inkSoft,
                    display: "flex",
                  }}
                >
                  <LeafArrowIcon />
                </span>
              </button>
            </>
          )}

          <div
            style={{
              margin: "4px 0",
              borderBottom: `1px solid ${inkFaint}`,
            }}
          />
          <button
            style={menuItemStyle}
            onClick={() => {
              window.electronAPI?.createSettingsWindow();
              onClose();
            }}
            onMouseEnter={onEnterHover}
            onMouseLeave={onLeaveHover}
          >
            <GearIcon /> Settings
          </button>
          <button
            style={{ ...menuItemStyle, color: rust }}
            onClick={() => window.electronAPI?.quit()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(168,90,65,0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <DoorIcon /> Quit App
          </button>
        </div>
      )}
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  textAlign: "left",
  padding: "6px 8px",
  borderRadius: "8px",
  cursor: "pointer",
  width: "100%",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "background 0.2s",
};
