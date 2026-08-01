import React, { useState } from "react";
import { usePetStore } from "../../state/usePetStore";

type Tab = "ai" | "voice" | "pet";

export const SettingsWindow: React.FC = () => {
  const store = usePetStore();
  const [tab, setTab] = useState<Tab>("ai");
  const [saved, setSaved] = useState(false);

  // Local form state — only commits on Save
  const [apiProvider, setApiProvider] = useState(store.apiConfig.provider);
  const [apiKey, setApiKey] = useState(store.apiConfig.apiKey);
  const [model, setModel] = useState(store.apiConfig.model);
  const [temperature, setTemperature] = useState(store.apiConfig.temperature);

  const [ttsProvider, setTtsProvider] = useState(store.voiceConfig.ttsProvider);
  const [voiceId, setVoiceId] = useState(store.voiceConfig.voiceId);
  const [speed, setSpeed] = useState(store.voiceConfig.speed);
  const [voiceEnabled, setVoiceEnabled] = useState(store.voiceConfig.enabled);

  const [personality, setPersonality] = useState(store.pet.personality);
  // Name editing disabled — pet is always Kibo
  // const [petName, setPetName] = useState(store.pet.name);

  const handleSave = () => {
    store.setApiConfig({ provider: apiProvider, apiKey, model, temperature });
    store.setVoiceConfig({
      ttsProvider,
      voiceId,
      speed,
      enabled: voiceEnabled,
    });
    store.setPersonality(personality);
    // store.setName(petName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClose = () => {
    window.electronAPI?.closeSettingsWindow();
    // Fallback: close via window.close() if IPC doesn't work
    window.close();
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 15, 25, 0.92)",
        backdropFilter: "blur(20px)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        color: "#e8eaf0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Title bar — draggable */}
      <div
        style={
          {
            WebkitAppRegion: "drag",
            padding: "16px 20px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          } as React.CSSProperties
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>⚙️</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: "0.02em",
            }}
          >
            Kibo Settings
          </span>
        </div>
        <button
          onClick={handleClose}
          style={
            {
              WebkitAppRegion: "no-drag",
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#aaa",
              borderRadius: "8px",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            } as React.CSSProperties
          }
        >
          ×
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "12px 20px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {(["ai", "voice", "pet"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? "rgba(139,92,246,0.25)" : "transparent",
              border:
                tab === t
                  ? "1px solid rgba(139,92,246,0.5)"
                  : "1px solid transparent",
              color: tab === t ? "#c4b5fd" : "#6b7280",
              borderRadius: "8px 8px 0 0",
              padding: "6px 16px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}
          >
            {t === "ai" ? "🤖 AI" : t === "voice" ? "🎙️ Voice" : "🐾 Pet"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* ── AI Tab ── */}
        {tab === "ai" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="AI Provider">
              <Select
                value={apiProvider}
                onChange={(v) => {
                  setApiProvider(v);
                  // Auto-switch model when provider changes
                  if (v === "gemini") setModel("gemini-2.0-flash");
                  if (v === "groq") setModel("llama-3.3-70b-versatile");
                }}
                options={[
                  { value: "gemini", label: "🌀 Google Gemini (free)" },
                  { value: "groq", label: "⚡ Groq (free, fastest)" },
                ]}
              />
            </Field>

            <Field label="Model">
              {apiProvider === "gemini" ? (
                <Select
                  value={model}
                  onChange={setModel}
                  options={[
                    {
                      value: "gemini-2.0-flash",
                      label: "Gemini 2.0 Flash (default)",
                    },
                    {
                      value: "gemini-2.5-flash-preview-05-20",
                      label: "Gemini 2.5 Flash (smarter)",
                    },
                    {
                      value: "gemini-2.5-pro-preview-06-05",
                      label: "Gemini 2.5 Pro (best)",
                    },
                  ]}
                />
              ) : (
                <Select
                  value={model}
                  onChange={setModel}
                  options={[
                    {
                      value: "llama-3.3-70b-versatile",
                      label: "Llama 3.3 70B (best quality)",
                    },
                    {
                      value: "llama-3.1-8b-instant",
                      label: "Llama 3.1 8B (fastest)",
                    },
                    {
                      value: "mixtral-8x7b-32768",
                      label: "Mixtral 8x7B (balanced)",
                    },
                  ]}
                />
              )}
            </Field>

            <Field label="API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={inputStyle}
              />
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                Stored locally. Never sent anywhere except the AI provider.
              </div>
            </Field>

            <Field label="Model">
              {apiProvider === "openai" ? (
                <Select
                  value={model}
                  onChange={setModel}
                  options={[
                    {
                      value: "gpt-4o-mini",
                      label: "GPT-4o Mini (fast, cheap)",
                    },
                    { value: "gpt-4o", label: "GPT-4o (smarter)" },
                    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
                  ]}
                />
              ) : (
                <Select
                  value={model}
                  onChange={setModel}
                  options={[
                    {
                      value: "gemini-2.0-flash",
                      label: "Gemini 2.0 Flash (default, free)",
                    },
                    {
                      value: "gemini-2.5-flash-preview-05-20",
                      label: "Gemini 2.5 Flash (faster)",
                    },
                    {
                      value: "gemini-2.5-pro-preview-06-05",
                      label: "Gemini 2.5 Pro (smartest)",
                    },
                  ]}
                />
              )}
            </Field>

            <Field label={`Temperature: ${temperature.toFixed(1)}`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#8b5cf6" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                  color: "#6b7280",
                  marginTop: "2px",
                }}
              >
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </Field>
          </div>
        )}

        {/* ── Voice Tab ── */}
        {tab === "voice" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Field label="Voice Enabled">
              <Toggle value={voiceEnabled} onChange={setVoiceEnabled} />
            </Field>

            <Field label="TTS Provider">
              <Select
                value={ttsProvider}
                onChange={setTtsProvider}
                options={[
                  { value: "edge", label: "Microsoft Edge TTS (free)" },
                  { value: "openai", label: "OpenAI TTS (better quality)" },
                ]}
              />
            </Field>

            <Field label="Voice">
              {ttsProvider === "edge" ? (
                <Select
                  value={voiceId}
                  onChange={setVoiceId}
                  options={[
                    { value: "en-US-AriaNeural", label: "Aria (US, warm)" },
                    {
                      value: "en-US-JennyNeural",
                      label: "Jenny (US, friendly)",
                    },
                    { value: "en-GB-SoniaNeural", label: "Sonia (UK)" },
                    { value: "en-AU-NatashaNeural", label: "Natasha (AU)" },
                  ]}
                />
              ) : (
                <Select
                  value={voiceId}
                  onChange={setVoiceId}
                  options={[
                    { value: "nova", label: "Nova (warm)" },
                    { value: "alloy", label: "Alloy (neutral)" },
                    { value: "shimmer", label: "Shimmer (soft)" },
                  ]}
                />
              )}
            </Field>

            <Field label={`Speed: ${speed.toFixed(1)}x`}>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#8b5cf6" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                  color: "#6b7280",
                  marginTop: "2px",
                }}
              >
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </Field>

            <div
              style={{
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "0.75rem",
                color: "#a78bfa",
              }}
            >
              💡 Shortcut: <strong>Alt+Shift+A</strong> — highlight any text
              then press this to have kibo read it aloud.
            </div>
          </div>
        )}

        {/* ── Pet Tab ── */}
        {tab === "pet" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Pet Name field disabled — pet is always Kibo */}
            {/*
            <Field label="Pet Name">
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                maxLength={12}
                placeholder="kibo"
                style={inputStyle}
              />
            </Field>
            */}

            <Field label="Personality">
              <Select
                value={personality}
                onChange={setPersonality}
                options={[
                  {
                    value: "playful",
                    label: "🎉 Playful — energetic, loves games",
                  },
                  {
                    value: "curious",
                    label: "🔍 Curious — asks questions, explores",
                  },
                  {
                    value: "intelligent",
                    label: "🧠 Intelligent — thoughtful, precise",
                  },
                  { value: "lazy", label: "😴 Lazy — chill, sleeps a lot" },
                  { value: "energetic", label: "⚡ Energetic — always moving" },
                  {
                    value: "sarcastic",
                    label: "😏 Sarcastic — witty, dry humor",
                  },
                ]}
              />
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                Affects how kibo responds in chat and behaves on screen.
              </div>
            </Field>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "0.75rem",
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                KEYBOARD SHORTCUTS
              </div>
              <div>
                <kbd style={kbdStyle}>Alt+Shift+A</kbd> Read / Ask kibo about
                selected text
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
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
          style={{
            ...primaryButtonStyle,
            background: saved ? "rgba(34,197,94,0.3)" : "rgba(139,92,246,0.3)",
            borderColor: saved ? "rgba(34,197,94,0.5)" : "rgba(139,92,246,0.5)",
            color: saved ? "#86efac" : "#c4b5fd",
          }}
        >
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

// ─── Reusable sub-components ──────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label
      style={{
        display: "block",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#9ca3af",
        marginBottom: "6px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const Select: React.FC<{
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ ...inputStyle, cursor: "pointer" }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: "44px",
      height: "24px",
      background: value ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)",
      borderRadius: "12px",
      position: "relative",
      cursor: "pointer",
      transition: "background 0.2s",
      border: "1px solid rgba(255,255,255,0.1)",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "3px",
        left: value ? "22px" : "3px",
        width: "16px",
        height: "16px",
        background: "white",
        borderRadius: "50%",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    />
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "#e8eaf0",
  fontFamily: "'Outfit','Inter',sans-serif",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: "8px",
  border: "1px solid rgba(139,92,246,0.5)",
  background: "rgba(139,92,246,0.3)",
  color: "#c4b5fd",
  fontFamily: "'Outfit','Inter',sans-serif",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#6b7280",
  fontFamily: "'Outfit','Inter',sans-serif",
  fontSize: "0.85rem",
  cursor: "pointer",
};

const kbdStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  padding: "1px 6px",
  fontSize: "0.72rem",
  fontFamily: "monospace",
  color: "#d1d5db",
};
