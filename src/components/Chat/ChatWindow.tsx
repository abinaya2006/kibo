import React, { useState, useEffect } from "react";
import { usePetStore } from "../../state/usePetStore";
import { DatabaseService } from "../../services/DatabaseService";
import { chatControllerSingleton } from "../../controllers/ChatController";
import { MessageList, stripEmoji } from "./MessageList";
import { VoiceManager } from "../../services/VoiceManager";
import type { DatabaseMessage } from "../../models/types";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";

const THEMES = {
  light: {
    bg: "#fbfbfb",
    headerBg: "#f5f5f5",
    inputBarBg: "#f5f5f5",
    text: "#0d0d0d",
    sub: "#8a8a8a",
    border: "rgba(0,0,0,0.08)",
    divider: "rgba(0,0,0,0.07)",
    inputBg: "#fff",
    inputBorder: "rgba(0,0,0,0.15)",
    pillBg: "rgba(0,0,0,0.05)",
    overlayBg: "#fbfbfb",
    accent: "#22a55e",
    danger: "#e74c3c",
  },
  dark: {
    bg: "#151520",
    headerBg: "#1e1e2d",
    inputBarBg: "#1c1c28",
    text: "#ffffff",
    sub: "#95a5a6",
    border: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.06)",
    inputBg: "rgba(255,255,255,0.04)",
    inputBorder: "rgba(255,255,255,0.1)",
    pillBg: "rgba(255,255,255,0.05)",
    overlayBg: "#151522",
    accent: "#3498db",
    danger: "#e74c3c",
  },
};

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

  // ── Single listener for highlighted-text context ────────────────────────────
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
        borderRadius: isFullscreen ? 0 : "16px",
        border: isFullscreen ? "none" : `1px solid ${c.border}`,
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        color: c.text,
        fontFamily: SANS,
        transition: "background 0.2s, color 0.2s, border-radius 0.15s",
      }}
      onMouseEnter={() => window.electronAPI?.setChatIgnoreMouseEvents(false)}
      onMouseLeave={() => window.electronAPI?.setChatIgnoreMouseEvents(true)}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          background: c.headerBg,
          borderBottom: `1px solid ${c.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background:
                pet.state === "speaking"
                  ? "#2ecc71"
                  : pet.state === "thinking"
                    ? "#f1c40f"
                    : c.accent,
            }}
          />
          <span style={{ fontWeight: 650, fontSize: "0.95rem" }}>
            {pet.name} AI Companion
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: c.sub,
              background: c.pillBg,
              padding: "2px 6px",
              borderRadius: "8px",
            }}
          >
            Lvl {pet.level}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              const next = !isFullscreen;
              setIsFullscreen(next);
              // Temporarily disabled — was corrupting chat window bounds
              // window.electronAPI?.setChatFullscreen(next);
            }}
            style={{
              background: "none",
              border: "none",
              color: isFullscreen ? c.accent : c.sub,
              cursor: "pointer",
              fontSize: "1rem",
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "🗗" : "🗖"}
          </button>
          <button
            onClick={() => window.electronAPI?.createSettingsWindow()}
            style={{
              background: "none",
              border: "none",
              color: showSettings ? c.accent : c.sub,
              cursor: "pointer",
              fontSize: "1rem",
            }}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => window.electronAPI?.closeChatWindow()}
            style={{
              background: "none",
              border: "none",
              color: c.sub,
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: "1",
            }}
            title="Close Panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <MessageList
          messages={messages}
          onSpeak={(text) => {
            const msg = messages.find((m) => m.content === text);
            handleSpeakMessage(msg?.id ?? text, text);
          }}
          speakingId={speakingId}
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
              fontSize: "0.85rem",
              color: c.text,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `1px solid ${c.divider}`,
                paddingBottom: "8px",
              }}
            >
              <strong style={{ fontSize: "1rem" }}>
                Companion Preferences
              </strong>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: c.danger,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <strong>AI Provider</strong>
              <select
                value={apiConfig.provider}
                onChange={(e) =>
                  store.setApiConfig({ provider: e.target.value as any })
                }
                style={{
                  background: c.inputBg,
                  border: `1px solid ${c.inputBorder}`,
                  color: c.text,
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
              </select>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginTop: "4px",
                }}
              >
                <span>API Key</span>
                <input
                  type="password"
                  value={apiConfig.apiKey}
                  placeholder="Paste your API key here"
                  onChange={(e) =>
                    store.setApiConfig({ apiKey: e.target.value })
                  }
                  style={{
                    background: c.inputBg,
                    border: `1px solid ${c.inputBorder}`,
                    color: c.text,
                    padding: "6px",
                    borderRadius: "6px",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                borderTop: `1px solid ${c.divider}`,
                paddingTop: "10px",
              }}
            >
              <strong>Speech Synthesizer (TTS)</strong>
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={voiceConfig.enabled}
                  onChange={(e) =>
                    store.setVoiceConfig({ enabled: e.target.checked })
                  }
                />
                <span>Enable Voice Output</span>
              </label>
              <select
                value={voiceConfig.ttsProvider}
                onChange={(e) =>
                  store.setVoiceConfig({ ttsProvider: e.target.value as any })
                }
                style={{
                  background: c.inputBg,
                  border: `1px solid ${c.inputBorder}`,
                  color: c.text,
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <option value="edge">
                  Edge TTS (Free Keyless Web Synthesis)
                </option>
                <option value="openai">
                  OpenAI Premium TTS (Requires API Key)
                </option>
              </select>
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop: `1px solid ${c.divider}`,
                paddingTop: "12px",
              }}
            >
              <button
                onClick={handleClearChat}
                style={{
                  width: "100%",
                  background: c.danger,
                  border: "none",
                  color: "white",
                  padding: "8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                🧹 Clear History Memory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "12px 16px",
          background: c.inputBarBg,
          borderTop: `1px solid ${c.divider}`,
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={inputText}
          disabled={loading}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask companion..."
          style={{
            flex: 1,
            minWidth: 0,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            borderRadius: "20px",
            padding: "8px 16px",
            color: c.text,
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          style={{
            background:
              loading || !inputText.trim() ? c.pillBg : c.accent,
            color: loading || !inputText.trim() ? c.sub : "#fff",
            border: "none",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ➔
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;