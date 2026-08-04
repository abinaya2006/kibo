import React, { useEffect, useRef, useState } from "react";
import { usePetStore } from "../../state/usePetStore";

const DEFAULT_SHORTCUT = ["Alt", "Shift", "A"];

const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace";
const SANS = "'Outfit', 'Inter', sans-serif";

type SaveState = "idle" | "saving" | "saved";

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash — default" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash — smarter" },
  { value: "gemini-2.5-pro-preview-06-05", label: "Gemini 2.5 Pro — best" },
];

const GROQ_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B — best quality" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B — fastest" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B — balanced" },
];

export const SettingsWindow: React.FC = () => {
  const store = usePetStore();
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [apiProvider, setApiProvider] = useState(store.apiConfig.provider);
  const [apiKey, setApiKey] = useState(store.apiConfig.apiKey);
  const [model, setModel] = useState(store.apiConfig.model);

  const [shortcut, setShortcut] = useState<string[]>(store.shortcut ?? DEFAULT_SHORTCUT);
  const [recording, setRecording] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const modelOptions = apiProvider === "gemini" ? GEMINI_MODELS : GROQ_MODELS;

  // ── Guard against a stored model value that doesn't exist in the current
  // options list — a native <select> renders BLANK (no visible text) when its
  // value doesn't match any <option>, which is one cause of "missing text". ──
  useEffect(() => {
    const valid = modelOptions.some((o) => o.value === model);
    if (!valid) setModel(modelOptions[0].value);
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    window.electronAPI?.closeSettingsWindow();
    window.close();
  };

  const handleSave = () => {
    if (saveState !== "idle") return;
    store.setApiConfig({ provider: apiProvider, apiKey, model, temperature: store.apiConfig.temperature });
    store.setShortcut?.(shortcut);
    setSaveState("saving");
    setTimeout(() => setSaveState("saved"), 500);
    setTimeout(() => setSaveState("idle"), 2100);
  };

  // ── Click outside to close ──────────────────────────────────────────────
  // This is a separate frameless Electron window whose root fills the entire
  // viewport, so a `document mousedown` listener never sees an "outside"
  // click — every click lands inside rootRef. The correct signal for "the
  // user clicked outside this window" is the window losing OS focus.
  // We debounce briefly because opening a native <select> dropdown can itself
  // trigger a transient blur/focus on some platforms; without the delay the
  // panel would close the instant you open a dropdown.
  useEffect(() => {
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;

    const onBlur = () => {
      if (recording) return;
      blurTimeout = setTimeout(() => {
        handleClose();
      }, 150);
    };
    const onFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (blurTimeout) clearTimeout(blurTimeout);
    };
  }, [recording]);

  // ── Shortcut capture ────────────────────────────────────────────────────
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      const keys: string[] = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.metaKey) keys.push("Cmd");
      const isModifier = ["Control", "Alt", "Shift", "Meta"].includes(e.key);
      if (!isModifier) {
        keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
        setShortcut(keys);
        setRecording(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording]);

  return (
    <div
      ref={rootRef}
      style={{
        width: "100vw",
        minWidth: "480px",
        height: "100vh",
        background: "#15110c",
        fontFamily: SANS,
        color: "#efe6d8",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        borderRadius: "14px",
        border: "1px solid rgba(217,161,91,0.16)",
        boxSizing: "border-box",
        position: "relative",
        colorScheme: "dark", // ← forces native controls (select/input) to render dark-theme text, fixing invisible text
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .rivet {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(217,161,91,0.35);
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.4);
        }

        .kibo-scroll { scrollbar-width: thin; scrollbar-color: rgba(217,161,91,0.3) transparent; }
        .kibo-scroll::-webkit-scrollbar { width: 6px; }
        .kibo-scroll::-webkit-scrollbar-track { background: transparent; }
        .kibo-scroll::-webkit-scrollbar-thumb { background: rgba(217,161,91,0.28); border-radius: 8px; }
        .kibo-scroll::-webkit-scrollbar-thumb:hover { background: rgba(217,161,91,0.5); }

        select.kibo-select {
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23a3906c' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px !important;
          color: #efe6d8 !important;
        }
        select.kibo-select option {
          background: #1c1712;
          color: #efe6d8;
        }
        input.kibo-input {
          color: #efe6d8 !important;
          -webkit-text-fill-color: #efe6d8;
        }

        .save-btn {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .save-btn .save-fill {
          position: absolute;
          inset: 0;
          left: -100%;
          background: linear-gradient(90deg, rgba(217,161,91,0.0), rgba(217,161,91,0.55) 45%, rgba(217,161,91,0.0));
          z-index: 0;
        }
        .save-btn.is-saving .save-fill {
          animation: fillSweep 0.5s ease forwards;
        }
        .save-btn.is-saved {
          transform: scale(1.03);
        }
        .save-btn.is-saved .save-fill { display: none; }
        @keyframes fillSweep {
          0% { left: -100%; }
          100% { left: 0%; width: 100%; }
        }
        @keyframes labelIn {
          0% { transform: translateY(60%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .save-label {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          animation: labelIn 0.22s ease;
        }
        .save-pulse-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: currentColor;
        }
        .save-btn.is-saving .save-pulse-dot {
          animation: dotBounce 0.5s ease-in-out infinite;
        }
        @keyframes dotBounce {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        @keyframes recordBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .recording-dot { animation: recordBlink 1s ease-in-out infinite; }
      `}</style>

      <span className="rivet" style={{ top: "9px", left: "9px" }} />
      <span className="rivet" style={{ top: "9px", right: "9px" }} />
      <span className="rivet" style={{ bottom: "9px", left: "9px" }} />
      <span className="rivet" style={{ bottom: "9px", right: "9px" }} />

      {/* Title bar */}
      <div
        style={
          {
            WebkitAppRegion: "drag",
            padding: "14px 22px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          } as React.CSSProperties
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <IconSettings />
          <span
            style={{
              fontWeight: 600,
              fontSize: "0.86rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#efe6d8",
              fontFamily: MONO,
              whiteSpace: "nowrap",
            }}
          >
            Kibo · AI Config
          </span>
        </div>
        <button onClick={handleClose} style={closeButtonStyle as React.CSSProperties}>
          <IconClose />
        </button>
      </div>

      {/* Grid */}
      <div
        className="kibo-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 22px 16px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "8px",
          alignContent: "start",
        }}
      >
        <Cell icon={<IconProvider />} label="Provider">
          <Select
            value={apiProvider}
            onChange={(v) => {
              setApiProvider(v);
              if (v === "gemini") setModel(GEMINI_MODELS[0].value);
              if (v === "groq") setModel(GROQ_MODELS[0].value);
            }}
            options={[
              { value: "gemini", label: "Google Gemini" },
              { value: "groq", label: "Groq" },
            ]}
          />
        </Cell>

        <Cell icon={<IconModel />} label="Model">
          <Select value={model} onChange={setModel} options={modelOptions} />
        </Cell>

        <Cell icon={<IconKey />} label="API Key" span={2}>
          <input
            type="password"
            className="kibo-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key"
            style={inputStyle}
          />
          <div style={hintStyle}>Stored locally. Only sent to your chosen provider.</div>
        </Cell>

        <Cell icon={<IconKeyboard />} label="Shortcut" span={2} muted>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
              {recording ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#cc7a6f" }}>
                  <span className="recording-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#cc7a6f" }} />
                  Press any key combo… (Esc to cancel)
                </span>
              ) : (
                shortcut.map((k, i) => (
                  <React.Fragment key={k + i}>
                    {i > 0 && <span style={{ color: "#6b5c45", fontSize: "0.78rem" }}>+</span>}
                    <kbd style={kbdStyle}>{k}</kbd>
                  </React.Fragment>
                ))
              )}
            </div>
            <button
              onClick={() => setRecording(true)}
              disabled={recording}
              style={{ ...changeShortcutButtonStyle, opacity: recording ? 0.5 : 1, cursor: recording ? "default" : "pointer" }}
            >
              Change
            </button>
          </div>
          {!recording && (
            <div style={{ fontSize: "0.72rem", color: "#8f8069", marginTop: "6px", lineHeight: 1.5 }}>
              Highlight any text, then press this to have Kibo read it aloud.
            </div>
          )}
        </Cell>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 22px",
          borderTop: "1px solid rgba(217,161,91,0.1)",
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
        }}
      >
        <button onClick={handleClose} style={secondaryButtonStyle}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`save-btn${saveState !== "idle" ? ` is-${saveState}` : ""}`}
          style={{
            ...primaryButtonStyle,
            background:
              saveState === "saved"
                ? "#8fbf7f"
                : saveState === "saving"
                ? "rgba(217,161,91,0.22)"
                : "rgba(217,161,91,0.14)",
            borderColor: saveState === "saved" ? "#8fbf7f" : "rgba(217,161,91,0.4)",
            color: saveState === "saved" ? "#15110c" : "#e3bd85",
          }}
        >
          <span className="save-fill" />
          <span className="save-label" key={saveState}>
            {saveState === "saving" && (
              <>
                <span className="save-pulse-dot" /> Saving
              </>
            )}
            {saveState === "saved" && "Saved"}
            {saveState === "idle" && "Save Changes"}
          </span>
        </button>
      </div>
    </div>
  );
};

// ─── Cell ─────────────────────────────────────────────────────────────────

const Cell: React.FC<{
  icon: React.ReactNode;
  label: string;
  span?: 1 | 2;
  muted?: boolean;
  children: React.ReactNode;
}> = ({ icon, label, span = 1, muted, children }) => (
  <div
    style={{
      gridColumn: span === 2 ? "span 2" : "span 1",
      minWidth: 0,
      background: muted ? "rgba(217,161,91,0.02)" : "rgba(217,161,91,0.035)",
      border: "1px solid rgba(217,161,91,0.1)",
      borderRadius: "10px",
      padding: "10px 12px",
      overflow: "hidden",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
      <span style={{ color: "#c99a5b", display: "flex" }}>{icon}</span>
      <span
        style={{
          fontSize: "0.63rem",
          fontWeight: 600,
          color: "#8f8069",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: MONO,
        }}
      >
        {label}
      </span>
    </div>
    {children}
  </div>
);

// ─── Select ─────────────────────────────────────────────────────────────────

const Select: React.FC<{
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    className="kibo-select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ ...inputStyle, cursor: "pointer", colorScheme: "dark" }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value} style={{ background: "#1c1712", color: "#efe6d8" }}>
        {o.label}
      </option>
    ))}
  </select>
);

// ─── Icons ────────────────────────────────────────────────────────────────

const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconSettings = () => (
  <svg {...iconProps} width={16} height={16}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconClose = () => (
  <svg {...iconProps} width={12} height={12}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconProvider = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 4v5" />
  </svg>
);
const IconModel = () => (
  <svg {...iconProps}>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
const IconKey = () => (
  <svg {...iconProps}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.5 12.5 8-8M16 8l2 2M19 5l2 2" />
  </svg>
);
const IconKeyboard = () => (
  <svg {...iconProps}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
  </svg>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "block",
  background: "rgba(0,0,0,0.22)",
  border: "1px solid rgba(217,161,91,0.16)",
  borderRadius: "7px",
  padding: "7px 10px",
  color: "#efe6d8",
  fontFamily: SANS,
  fontSize: "0.79rem",
  outline: "none",
  boxSizing: "border-box",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const hintStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  color: "#6f6350",
  marginTop: "6px",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "7px 18px",
  borderRadius: "7px",
  border: "1px solid rgba(217,161,91,0.4)",
  background: "rgba(217,161,91,0.14)",
  color: "#e3bd85",
  fontFamily: SANS,
  fontSize: "0.79rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.15s",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: "7px",
  border: "1px solid transparent",
  background: "transparent",
  color: "#a3906c",
  fontFamily: SANS,
  fontSize: "0.79rem",
  fontWeight: 500,
  cursor: "pointer",
};

const changeShortcutButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(217,161,91,0.25)",
  background: "rgba(217,161,91,0.08)",
  color: "#d9a15b",
  fontFamily: SANS,
  fontSize: "0.67rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const closeButtonStyle = {
  WebkitAppRegion: "no-drag",
  background: "rgba(217,161,91,0.06)",
  border: "none",
  color: "#a3906c",
  borderRadius: "7px",
  width: "24px",
  height: "24px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const kbdStyle: React.CSSProperties = {
  background: "rgba(217,161,91,0.08)",
  border: "1px solid rgba(217,161,91,0.2)",
  borderRadius: "5px",
  padding: "2px 6px",
  fontSize: "0.68rem",
  fontFamily: MONO,
  color: "#d9c9a8",
};

export default SettingsWindow;
