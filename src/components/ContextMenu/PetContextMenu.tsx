import React, { useState } from "react";
import { usePetStore } from "../../state/usePetStore";
import { ActionController } from "../../controllers/ActionController";

interface PetContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";

/* Matches SettingsWindow light theme */
const text = "#0d0d0d";
const sub = "#8a8a8a";
const border = "rgba(0,0,0,0.08)";
const divider = "rgba(0,0,0,0.07)";
const itemBg = "#f3f3f3";
const itemHoverBg = "#eaeaea";
const bg = "#fbfbfb";
const rust = "#d1453b";

const iconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MoonIcon = () => (
  <svg {...iconProps}><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" /></svg>
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
const CrossIcon = () => (
  <svg {...iconProps} width={12} height={12}><path d="M6 6 18 18M18 6 6 18" /></svg>
);

const FOOD_ITEMS = [
  { icon: DrumstickIcon, label: "Meat", hunger: 40, happiness: 15 },
  { icon: FishIcon, label: "Fish", hunger: 35, happiness: 20 },
  { icon: MilkIcon, label: "Milk", hunger: 10, happiness: 12 },
];

const ChatIcon = () => (
  <svg {...iconProps}>
    <path d="M4 5.5h16v11H9.5L5 20.5V16.5H4z" />
  </svg>
);

export const PetContextMenu: React.FC<PetContextMenuProps> = ({ x, y, onClose }) => {
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

  return (
    <div
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: "0 16px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
        borderRadius: "14px",
        padding: "12px",
        zIndex: 9999,
        width: "300px",
        fontFamily: SANS,
        fontSize: "0.85rem",
        color: text,
        pointerEvents: "auto",
      }}
    >
      {/* Header row — name + mood inline, horizontal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: "10px",
          marginBottom: "10px",
          borderBottom: `1px solid ${divider}`,
        }}
      >
        <strong style={{ fontSize: "0.95rem" }}>{pet.name}</strong>
        <span style={{ fontSize: "0.68rem", color: sub }}>
          {pet.mood.toUpperCase()} · Hunger {Math.round(pet.emotions.hunger)}
        </span>
      </div>

      {showFoodPicker ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.4px", color: sub }}>CHOOSE FOOD</span>
            <button onClick={() => setShowFoodPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", color: sub, display: "flex" }}>
              <CrossIcon />
            </button>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {FOOD_ITEMS.map((food) => {
              const Icon = food.icon;
              return (
                <button
                  key={food.label}
                  onClick={() => handleFeed(food)}
                  style={{ ...tileStyle, flex: 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}
                >
                  <Icon />
                  <span style={{ fontSize: "0.68rem", color: sub }}>{food.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Horizontal action row — this is the "wider, less vertical" fix */}
          <div style={{ display: "flex", gap: "6px" }}>
            {pet.state === "sleeping" ? (
              <button style={{ ...tileStyle, flex: 1 }} onClick={() => handleInteract("wake")} onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}>
                <SunIcon />
                <span style={tileLabelStyle}>Wake Up</span>
              </button>
            ) : (
              <>
                <button style={{ ...tileStyle, flex: 1 }} onClick={() => handleInteract("sleep")} onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}>
                  <MoonIcon />
                  <span style={tileLabelStyle}>Sleep</span>
                </button>
                <button style={{ ...tileStyle, flex: 1 }} onClick={() => handleInteract("play")} onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}>
                  <YarnIcon />
                  <span style={tileLabelStyle}>Play</span>
                </button>
                <button style={{ ...tileStyle, flex: 1 }} onClick={() => setShowFoodPicker(true)} onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}>
                  <BowlIcon />
                  <span style={tileLabelStyle}>Feed</span>
                </button>
              </>
            )}
          </div>

          <div style={{ margin: "10px 0", borderBottom: `1px solid ${divider}` }} />

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              style={{ ...tileStyle, flex: 1 }}
              onClick={() => {
                window.electronAPI?.createChatWindow(null);
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}
            >
              <ChatIcon />
              <span style={tileLabelStyle}>Chat</span>
            </button>
            <button
              style={{ ...tileStyle, flex: 1 }}
              onClick={() => {
                window.electronAPI?.createSettingsWindow();
                onClose();
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}
            >
              <GearIcon />
              <span style={tileLabelStyle}>Settings</span>
            </button>
            <button
              style={{ ...tileStyle, flex: 1, color: rust }}
              onClick={() => window.electronAPI?.quit()}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(209,69,59,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}
            >
              <DoorIcon />
              <span style={{ ...tileLabelStyle, color: rust }}>Quit</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const tileStyle: React.CSSProperties = {
  background: itemBg,
  border: "none",
  borderRadius: "10px",
  padding: "9px 4px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "5px",
  fontFamily: SANS,
  color: text,
  transition: "background 0.15s",
};

const tileLabelStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 500,
};

export default PetContextMenu;