import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SelectionPopupProps {
  text: string;
  x: number;
  y: number;
  onExplain: () => void;
  onAskKibo: () => void;
  onClose: () => void;
}

export const SelectionPopup: React.FC<SelectionPopupProps> = ({
  text,
  x,
  y,
  onExplain,
  onAskKibo,
  onClose,
}) => {
  const preview = text.length > 60 ? text.slice(0, 60).trimEnd() + "..." : text;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 10 }}
        transition={{ type: "spring", damping: 18, stiffness: 250 }}
        style={{
          position: "fixed",
          left: `${x}px`,
          top: `${y}px`,
          zIndex: 99999,
          background: "rgba(15, 15, 25, 0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          padding: "10px 12px",
          minWidth: "200px",
          maxWidth: "280px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          fontFamily: "'Outfit','Inter',sans-serif",
          pointerEvents: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: "0.9rem",
            cursor: "pointer",
            lineHeight: 1,
            padding: "2px",
          }}
        >
          ✕
        </button>

        <div
          style={{
            fontSize: "0.72rem",
            color: "#6b7280",
            marginBottom: "8px",
            marginRight: "16px",
            lineHeight: 1.4,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: "8px",
          }}
        >
          "{preview}"
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => {
              onExplain();
              onClose();
            }}
            style={actionBtn("#2d1f4e", "#a78bfa")}
          >
            💡 Explain
          </button>
          <button
            onClick={() => {
              onAskKibo();
              onClose();
            }}
            style={actionBtn("#1f3d2e", "#4ade80")}
          >
            🐾 Ask Kibo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1,
    background: bg,
    border: `1px solid ${color}33`,
    borderRadius: "8px",
    color,
    padding: "7px 8px",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    fontFamily: "'Outfit','Inter',sans-serif",
    transition: "all 0.15s",
  };
}
