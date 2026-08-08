import React, { useEffect, useRef, useState } from "react";
import { usePetStore } from "../../state/usePetStore";

const DEFAULT_SHORTCUT = ["Alt", "Shift", "A"];
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
const MONO = "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

type SaveState = "idle" | "saving" | "saved";

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "2.0 Flash" },
  { value: "gemini-2.5-flash-preview-05-20", label: "2.5 Flash" },
  { value: "gemini-2.5-pro-preview-06-05", label: "2.5 Pro" },
];

const GROQ_MODELS = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

const THEMES = {
  light: {
    bg: "#fbfbfb",
    text: "#0d0d0d",
    sub: "#8a8a8a",
    border: "rgba(0,0,0,0.08)",
    divider: "rgba(0,0,0,0.07)",
    inputBg: "#fff",
    inputBorder: "rgba(0,0,0,0.15)",
    segBg: "#eee",
    segActiveBg: "#fff",
    segText: "#6b6b6b",
    segActiveText: "#0d0d0d",
    kbdBg: "#f0f0f0",
    kbdBorder: "rgba(0,0,0,0.12)",
    kbdText: "#333",
    saveBg: "#0d0d0d",
    saveText: "#fff",
    cancelBg: "#fff",
    cancelBorder: "rgba(0,0,0,0.12)",
    lockedBg: "#f2f2f2",
    lockedBorder: "rgba(0,0,0,0.1)",
    lockedText: "#4a4a4a",
    dot: "#a8a8a8",
  },
  dark: {
    bg: "#1c1c1e",
    text: "#f2f2f2",
    sub: "#9a9a9a",
    border: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.08)",
    inputBg: "#2a2a2d",
    inputBorder: "rgba(255,255,255,0.14)",
    segBg: "#2a2a2d",
    segActiveBg: "#3c3c3f",
    segText: "#9a9a9a",
    segActiveText: "#f2f2f2",
    kbdBg: "#2a2a2d",
    kbdBorder: "rgba(255,255,255,0.14)",
    kbdText: "#e0e0e0",
    saveBg: "#f2f2f2",
    saveText: "#1c1c1e",
    cancelBg: "#2a2a2d",
    cancelBorder: "rgba(255,255,255,0.14)",
    lockedBg: "#242426",
    lockedBorder: "rgba(255,255,255,0.1)",
    lockedText: "#c8c8c8",
    dot: "#666",
  },
};

export const SettingsWindow: React.FC = () => {
  const store = usePetStore();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const theme = store.theme; // global, persisted, synced across windows
  const c = THEMES[theme];

  const [apiProvider, setApiProvider] = useState(store.apiConfig.provider);
  const [apiKey, setApiKey] = useState(store.apiConfig.apiKey);
  const [model, setModel] = useState(store.apiConfig.model);

  // Codex-style key field: locked/read-only display once a key exists.
  // Editing means typing a fresh value — the stored key is never rendered.
  const [editingKey, setEditingKey] = useState(!store.apiConfig.apiKey);

  const [shortcut, setShortcut] = useState<string[]>(store.shortcut ?? DEFAULT_SHORTCUT);
  const [recording, setRecording] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const modelOptions = apiProvider === "gemini" ? GEMINI_MODELS : GROQ_MODELS;

  useEffect(() => {
    const valid = modelOptions.some((o) => o.value === model);
    if (!valid) setModel(modelOptions[0].value);
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
    if (apiKey.trim()) setEditingKey(false);
    setTimeout(() => setSaveState("saved"), 500);
    setTimeout(() => setSaveState("idle"), 2100);
  };

  useEffect(() => {
    let blurTimeout: ReturnType<typeof setTimeout> | null = null;
    const onBlur = () => {
      if (recording) return;
      blurTimeout = setTimeout(() => handleClose(), 150);
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
        width: "100%",
        minWidth: "540px",
        maxWidth: "600px",
        height: "100vh",
        maxHeight: "100vh",
        margin: "0 auto",
        background: c.bg,
        fontFamily: SANS,
        color: c.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        borderRadius: "14px",
        border: `1px solid ${c.border}`,
        boxSizing: "border-box",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        transition: "background 0.2s, color 0.2s",
      }}
    >
      <style>{`
        html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
        .kibo-scroll { scrollbar-width: thin; }
        .kibo-scroll::-webkit-scrollbar { width: 6px; }
        .kibo-scroll::-webkit-scrollbar-track { background: transparent; }
        .kibo-scroll::-webkit-scrollbar-thumb { background: ${theme === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}; border-radius: 8px; }

        .segmented { display: inline-flex; flex-wrap: nowrap; background: ${c.segBg}; border-radius: 8px; padding: 2px; gap: 2px; max-width: 100%; }
        .segmented button { border: none; background: transparent; padding: 5px 9px; font-size: 0.74rem; font-weight: 500; color: ${c.segText}; border-radius: 6px; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .segmented button.active { background: ${c.segActiveBg}; color: ${c.segActiveText}; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

        input.kibo-input { color: ${c.text}; font-family: ${MONO}; background: ${c.inputBg}; border-color: ${c.inputBorder}; }
        input.kibo-input::placeholder { color: ${c.sub}; font-family: ${SANS}; }

        @keyframes recordBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .recording-dot { animation: recordBlink 1s ease-in-out infinite; }

        .theme-toggle { display: flex; background: ${c.segBg}; border-radius: 999px; padding: 2px; gap: 2px; }
        .theme-toggle button { border: none; background: transparent; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${c.segText}; }
        .theme-toggle button.active { background: ${c.segActiveBg}; color: ${c.segActiveText}; }

        .key-locked { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: ${c.lockedBg}; border: 1px solid ${c.lockedBorder}; border-radius: 8px; padding: 7px 10px; }
        .key-dots { display: flex; align-items: center; gap: 3px; }
        .key-dots span { width: 4px; height: 4px; border-radius: 50%; background: ${c.dot}; display: inline-block; }
        .key-edit-btn { border: 1px solid ${c.inputBorder}; background: ${c.inputBg}; color: ${c.text}; font-family: ${SANS}; font-size: 0.72rem; font-weight: 500; border-radius: 999px; padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
        .key-edit-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Title bar */}
      <div
        style={
          {
            WebkitAppRegion: "drag",
            padding: "16px 20px 4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          } as React.CSSProperties
        }
      >
        <span style={{ fontWeight: 600, fontSize: "0.98rem" }}>Preferences</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="theme-toggle">
            <button className={theme === "light" ? "active" : ""} onClick={() => store.setTheme("light")} title="Light">
              <IconSun />
            </button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => store.setTheme("dark")} title="Dark">
              <IconMoon />
            </button>
          </div>
          <button onClick={handleClose} style={{ ...closeButtonStyle, color: c.sub } as React.CSSProperties}>
            <IconClose />
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="kibo-scroll" style={{ flex: "0 1 auto", minHeight: 0, overflowY: "auto", padding: "4px 20px 4px" }}>
        <Row title="Provider" desc="Which AI service powers Kibo" c={c}>
          <div className="segmented">
            {[
              { value: "gemini", label: "Gemini" },
              { value: "groq", label: "Groq" },
            ].map((o) => (
              <button
                key={o.value}
                className={apiProvider === o.value ? "active" : ""}
                onClick={() => {
                  setApiProvider(o.value as any);
                  if (o.value === "gemini") setModel(GEMINI_MODELS[0].value);
                  if (o.value === "groq") setModel(GROQ_MODELS[0].value);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Row>

        <Row title="Model" desc="Speed vs. response quality" c={c}>
          <div className="segmented">
            {modelOptions.map((o) => (
              <button key={o.value} className={model === o.value ? "active" : ""} onClick={() => setModel(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </Row>

        <Row title="API Key" desc="Stored locally, never shared" c={c}>
          {!editingKey && apiKey ? (
            <div className="key-locked">
              <div className="key-dots">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} />
                ))}
              </div>
              <button
                type="button"
                className="key-edit-btn"
                onClick={() => {
                  setApiKey("");
                  setEditingKey(true);
                }}
              >
                <IconPencil />
                Edit
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="password"
                className="kibo-input"
                autoFocus={editingKey}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key"
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              />
              {store.apiConfig.apiKey && (
                <button
                  type="button"
                  className="key-edit-btn"
                  onClick={() => {
                    setApiKey(store.apiConfig.apiKey);
                    setEditingKey(false);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </Row>

        <Row title="Shortcut" desc={recording ? undefined : "Reads highlighted text aloud"} c={c} last>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {recording ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#d1453b" }}>
                <span className="recording-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d1453b" }} />
                Press any key…
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {shortcut.map((k, i) => (
                  <React.Fragment key={k + i}>
                    {i > 0 && <span style={{ color: c.sub, fontSize: "0.74rem" }}>+</span>}
                    <kbd style={{ ...kbdStyle, background: c.kbdBg, borderColor: c.kbdBorder, color: c.kbdText }}>{k}</kbd>
                  </React.Fragment>
                ))}
              </div>
            )}
            <button
              onClick={() => setRecording(true)}
              disabled={recording}
              style={{
                ...pillButtonStyle,
                background: c.inputBg,
                borderColor: c.inputBorder,
                color: c.text,
                opacity: recording ? 0.5 : 1,
                cursor: recording ? "default" : "pointer",
              }}
            >
              Change
            </button>
          </div>
        </Row>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${c.border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <button onClick={handleClose} style={{ ...secondaryButtonStyle, background: c.cancelBg, borderColor: c.cancelBorder, color: c.text }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            ...primaryButtonStyle,
            background: saveState === "saved" ? "#22a55e" : c.saveBg,
            color: saveState === "saved" ? "#fff" : c.saveText,
            opacity: saveState === "saving" ? 0.7 : 1,
          }}
        >
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved"}
          {saveState === "idle" && "Save Changes"}
        </button>
      </div>
    </div>
  );
};

// ─── Row ─────────────────────────────────────────────────────────────────

const Row: React.FC<{ title: string; desc?: string; c: typeof THEMES.light; children: React.ReactNode; last?: boolean }> = ({
  title,
  desc,
  c,
  children,
  last,
}) => (
  <div style={{ padding: "8px 2px", borderBottom: last ? "none" : `1px solid ${c.divider}` }}>
    <div style={{ fontSize: "0.86rem", fontWeight: 500 }}>{title}</div>
    {desc && <div style={{ fontSize: "0.72rem", color: c.sub, marginTop: "1px", marginBottom: "6px" }}>{desc}</div>}
    <div style={{ marginTop: desc ? 0 : "6px" }}>{children}</div>
  </div>
);

// ─── Icons ────────────────────────────────────────────────────────────────

const IconClose = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconSun = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const IconMoon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);
const IconPencil = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "8px",
  padding: "7px 10px",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: "8px",
  border: "none",
  fontFamily: SANS,
  fontSize: "0.82rem",
  fontWeight: 500,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: "8px",
  border: "1px solid",
  fontFamily: SANS,
  fontSize: "0.82rem",
  fontWeight: 500,
  cursor: "pointer",
};

const pillButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "999px",
  border: "1px solid",
  fontFamily: SANS,
  fontSize: "0.72rem",
  fontWeight: 500,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const closeButtonStyle = {
  background: "transparent",
  border: "none",
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
  border: "1px solid",
  borderRadius: "5px",
  padding: "2px 6px",
  fontSize: "0.68rem",
  fontFamily: "monospace",
};

export default SettingsWindow;