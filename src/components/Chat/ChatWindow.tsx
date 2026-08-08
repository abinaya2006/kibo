import React, { useState, useEffect } from "react";
import { usePetStore } from "../../state/usePetStore";
import { DatabaseService } from "../../services/DatabaseService";
import { chatControllerSingleton } from "../../controllers/ChatController";
import { MessageList, stripEmoji } from "./MessageList";
import { VoiceManager } from "../../services/VoiceManager";
import type { DatabaseMessage } from "../../models/types";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
const MONO = "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

const THEMES = {
  light: {
    bg: "#fbfbfb",
    headerBg: "#fbfbfb",
    inputBarBg: "#fbfbfb",
    text: "#0d0d0d",
    sub: "#8a8a8a",
    border: "rgba(0,0,0,0.08)",
    divider: "rgba(0,0,0,0.07)",
    inputBg: "#fff",
    inputBorder: "rgba(0,0,0,0.15)",
    pillBg: "rgba(0,0,0,0.05)",
    overlayBg: "#fbfbfb",
    accent: "#0d0d0d",
    accentText: "#fff",
    danger: "#d1453b",
    userBubble: "#0d0d0d",
    userText: "#fff",
    aiBubble: "#f0f0f0",
    aiText: "#0d0d0d",
  },
  dark: {
    bg: "#1c1c1e",
    headerBg: "#1c1c1e",
    inputBarBg: "#1c1c1e",
    text: "#f2f2f2",
    sub: "#9a9a9a",
    border: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.08)",
    inputBg: "#2a2a2d",
    inputBorder: "rgba(255,255,255,0.14)",
    pillBg: "rgba(255,255,255,0.06)",
    overlayBg: "#1c1c1e",
    accent: "#f2f2f2",
    accentText: "#1c1c1e",
    danger: "#e0645a",
    userBubble: "#f2f2f2",
    userText: "#1c1c1e",
    aiBubble: "#2a2a2d",
    aiText: "#f2f2f2",
  },
};

export type ChatTheme = typeof THEMES.light;

export const ChatWindow: React.FC = () => {
  const store = usePetStore();
  const { apiConfig, voiceConfig, sessionId, pet } = store;
  const theme = store.theme;
  const c = THEMES[theme];

  const [messages, setMessages] = useState<DatabaseMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    window.electronAPI?.setChatIgnoreMouseEvents(false);
  }, []);

  useEffect(() => {
    const unsub = window.electronAPI?.onChatContext?.((text: string) => {
      if (!text?.trim()) return;
      usePetStore.getState().setPendingSelectionContext(text);
      injectContextMessage(text);
    });
    return () => unsub?.();
  }, []);

  const injectContextMessage = (text: string) => {
    const contextMsg: DatabaseMessage = {
      id: crypto.randomUUID(),
      sessionId: usePetStore.getState().sessionId,
      role: "assistant",
      content: `I see you highlighted:\n\n> "${text}"\n\nWhat would you like to know about it?`,
      timestamp: Date.now(),
    };
    DatabaseService.addMessage(contextMsg).then(() => loadHistory());
  };

  const loadHistory = async () => {
    const history = await DatabaseService.getHistory(sessionId);
    setMessages(history);
  };

  const handleSpeakMessage = async (id: string, text: string) => {
    if (speakingId === id) {
      VoiceManager.stop?.();
      setSpeakingId(null);
      return;
    }
    if (!text.trim()) return;
    const cleaned = stripEmoji(text);
    if (!cleaned) return;
    try {
      VoiceManager.stop?.();
      setSpeakingId(id);
      await VoiceManager.speak(cleaned, voiceConfig, apiConfig.apiKey, true);
    } catch (err) {
      console.error("Failed to read aloud:", err);
    } finally {
      setSpeakingId((current) => (current === id ? null : current));
    }
  };

  const sendQuery = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    setLoading(true);
    setInputText("");
    try {
      await chatControllerSingleton.handleSendPrompt(textToSend);
      await loadHistory();
    } catch (err: any) {
      alert(err.message || "API query execution failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(inputText);
  };

  const handleClearChat = async () => {
    if (confirm("Clear entire conversation memory?")) {
      await DatabaseService.clearHistory(sessionId);
      store.resetSession();
      setMessages([]);
    }
  };

  return (
    <div
      style={{
        width: isFullscreen ? "100vw" : "100%",
        height: isFullscreen ? "100vh" : "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 10000 : undefined,
        background: c.bg,
        display: "flex",
        flexDirection: "column",
        borderRadius: isFullscreen ? 0 : "14px",
        border: isFullscreen ? "none" : `1px solid ${c.border}`,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        color: c.text,
        fontFamily: SANS,
        transition: "background 0.2s, color 0.2s",
      }}
      onMouseEnter={() => window.electronAPI?.setChatIgnoreMouseEvents(false)}
      onMouseLeave={() => window.electronAPI?.setChatIgnoreMouseEvents(true)}
    >
      <style>{`
        .kibo-icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 5px; border-radius: 6px; color: ${c.sub}; }
        .kibo-icon-btn:hover { background: ${c.pillBg}; }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: c.headerBg,
          borderBottom: `1px solid ${c.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: pet.state === "thinking" ? "#e0a52c" : "#2fa563",
            }}
          />
          <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{pet.name}</span>
          <span
            style={{
              fontSize: "0.68rem",
              color: c.sub,
              background: c.pillBg,
              padding: "2px 6px",
              borderRadius: "999px",
              fontFamily: MONO,
            }}
          >
            Lvl {pet.level}
          </span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          <button className="kibo-icon-btn" onClick={() => setIsFullscreen((v) => !v)} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconExpand collapsed={!isFullscreen} />
          </button>
          <button className="kibo-icon-btn" onClick={() => window.electronAPI?.createSettingsWindow()} title="Settings">
            <IconGear />
          </button>
          <button className="kibo-icon-btn" onClick={() => window.electronAPI?.closeChatWindow()} title="Close Panel">
            <IconClose />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        <MessageList
          messages={messages}
          onSpeak={(text) => {
            const msg = messages.find((m) => m.content === text);
            handleSpeakMessage(msg?.id ?? text, text);
          }}
          speakingId={speakingId}
          isThinking={loading}
        />

        {showSettings && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: c.overlayBg,
              zIndex: 100,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "0.82rem",
              color: c.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${c.divider}`, paddingBottom: "8px" }}>
              <strong style={{ fontSize: "0.92rem" }}>Preferences</strong>
              <button className="kibo-icon-btn" onClick={() => setShowSettings(false)}>
                <IconClose />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <strong style={{ fontSize: "0.8rem" }}>AI Provider</strong>
              <select
                value={apiConfig.provider}
                onChange={(e) => store.setApiConfig({ provider: e.target.value as any })}
                style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.text, padding: "6px", borderRadius: "6px" }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: `1px solid ${c.divider}`, paddingTop: "10px" }}>
              <strong style={{ fontSize: "0.8rem" }}>Speech Output</strong>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={voiceConfig.enabled} onChange={(e) => store.setVoiceConfig({ enabled: e.target.checked })} />
                <span>Enable Voice Output</span>
              </label>
            </div>

            <div style={{ marginTop: "auto", borderTop: `1px solid ${c.divider}`, paddingTop: "12px" }}>
              <button
                onClick={handleClearChat}
                style={{ width: "100%", background: c.danger, border: "none", color: "#fff", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.8rem" }}
              >
                Clear History
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        style={{ padding: "10px 14px", background: c.inputBarBg, borderTop: `1px solid ${c.divider}`, display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}
      >
        <input
          type="text"
          value={inputText}
          disabled={loading}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message..."
          style={{
            flex: 1,
            minWidth: 0,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            borderRadius: "999px",
            padding: "8px 14px",
            color: c.text,
            fontSize: "0.82rem",
            fontFamily: SANS,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          style={{
            background: loading || !inputText.trim() ? c.pillBg : c.accent,
            color: loading || !inputText.trim() ? c.sub : c.accentText,
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            cursor: loading || !inputText.trim() ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconArrow />
        </button>
      </form>
    </div>
  );
};

const IconClose = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const IconGear = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
const IconExpand = ({ collapsed }: { collapsed: boolean }) =>
  collapsed ? (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m11-5v3a2 2 0 0 1-2 2h-3" /></svg>
  ) : (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m8-5h3a2 2 0 0 1 2 2v3" /></svg>
  );
const IconArrow = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);

export default ChatWindow;