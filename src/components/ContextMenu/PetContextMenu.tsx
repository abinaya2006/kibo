import React, { useState } from "react";
import { usePetStore } from "../../state/usePetStore";
import { SPECIES_CONFIGS } from "../../models/PetConfig";
import { ActionController } from "../../controllers/ActionController";

interface PetContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const FOOD_ITEMS = [
  { emoji: "🍖", label: "Meat", hunger: 40, happiness: 15 },
  { emoji: "🐟", label: "Fish", hunger: 35, happiness: 20 },
  { emoji: "🍪", label: "Cookie", hunger: 20, happiness: 30 },
  { emoji: "🥕", label: "Carrot", hunger: 25, happiness: 10 },
  { emoji: "🍓", label: "Berry", hunger: 15, happiness: 25 },
  { emoji: "🎂", label: "Cake", hunger: 30, happiness: 40 },
];

export const PetContextMenu: React.FC<PetContextMenuProps> = ({
  x,
  y,
  onClose,
}) => {
  const store = usePetStore();
  const { pet } = store;
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(pet.name);
  const [showFoodPicker, setShowFoodPicker] = useState(false);

  const handleSpeciesChange = (species: string) => {
    store.setPet({ ...pet, species, physics: { ...pet.physics } });
    onClose();
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameVal.trim()) {
      store.setName(nameVal.trim());
      setEditingName(false);
      onClose();
    }
  };

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
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        borderRadius: "16px",
        padding: "10px",
        zIndex: 9999,
        minWidth: "160px",
        fontFamily: "'Outfit','Inter',sans-serif",
        fontSize: "0.85rem",
        color: "#2c3e50",
        pointerEvents: "auto",
      }}
    >
      {/* Name header */}
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {editingName ? (
          <form
            onSubmit={handleRenameSubmit}
            style={{ display: "flex", gap: "4px" }}
          >
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              autoFocus
              maxLength={12}
              style={{
                width: "100%",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "2px 6px",
                fontSize: "0.8rem",
              }}
            />
            <button
              type="submit"
              style={{
                border: "none",
                background: "#4cd137",
                color: "white",
                borderRadius: "6px",
                padding: "2px 8px",
                cursor: "pointer",
              }}
            >
              ✓
            </button>
          </form>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong style={{ fontSize: "0.9rem" }}>{pet.name}</strong>
            <button
              onClick={() => setEditingName(true)}
              style={{
                background: "none",
                border: "none",
                color: "#3498db",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Rename
            </button>
          </div>
        )}
        <div style={{ fontSize: "0.7rem", color: "#7f8c8d", marginTop: "2px" }}>
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
              fontSize: "0.7rem",
              color: "#95a5a6",
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
                fontSize: "0.75rem",
                color: "#bdc3c7",
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              padding: "2px 0",
            }}
          >
            {FOOD_ITEMS.map((food) => (
              <button
                key={food.label}
                onClick={() => handleFeed(food)}
                style={{
                  background: "rgba(0,0,0,0.03)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "10px",
                  padding: "6px 4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,0,0,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
                }
              >
                <span style={{ fontSize: "1.4rem" }}>{food.emoji}</span>
                <span style={{ fontSize: "0.65rem", color: "#7f8c8d" }}>
                  {food.label}
                </span>
              </button>
            ))}
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
            >
              ☀️ Wake Up
            </button>
          ) : (
            <>
              <button
                style={menuItemStyle}
                onClick={() => handleInteract("sleep")}
              >
                🌙 Put to Sleep
              </button>
              <button
                style={menuItemStyle}
                onClick={() => handleInteract("play")}
              >
                🎾 Play
              </button>
              <button
                style={menuItemStyle}
                onClick={() => setShowFoodPicker(true)}
              >
                🍖 Feed
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem",
                    color: "#bdc3c7",
                  }}
                >
                  ▶
                </span>
              </button>
              <button
                style={menuItemStyle}
                onClick={() => handleInteract("think")}
              >
                💡 Meditate
              </button>
            </>
          )}

          <div
            style={{
              margin: "4px 0",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          />
          <div
            style={{ fontSize: "0.7rem", color: "#95a5a6", padding: "2px 8px" }}
          >
            CHANGE COMPANION
          </div>
          {Object.entries(SPECIES_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              style={{
                ...menuItemStyle,
                fontWeight: pet.species === key ? 700 : 400,
                background:
                  pet.species === key ? "rgba(0,0,0,0.04)" : "transparent",
              }}
              onClick={() => handleSpeciesChange(key)}
            >
              {(config as any).displayName}
            </button>
          ))}

          <div
            style={{
              margin: "4px 0",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          />
          <button
            style={menuItemStyle}
            onClick={() => {
              window.electronAPI?.createSettingsWindow();
              onClose();
            }}
          >
            ⚙️ Settings
          </button>
          <button
            style={{ ...menuItemStyle, color: "#e74c3c" }}
            onClick={() => window.electronAPI?.quit()}
          >
            👋 Quit App
          </button>
        </div>
      )}
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  background: "none",
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
  transition: "background 0.2s",
};
