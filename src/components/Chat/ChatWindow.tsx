import React, { useState, useEffect } from "react";
import { usePetStore } from "../../state/usePetStore";
import { DatabaseService } from "../../services/DatabaseService";
import { chatControllerSingleton } from "../../controllers/ChatController";
import { MessageList, stripEmoji } from "./MessageList";
import { VoiceManager } from "../../services/VoiceManager";
import { EventBus } from "../../services/EventBus";
import type { DatabaseMessage, SkillConfirmRequest } from "../../models/types";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";

const MIN_THINKING_MS = 2000;
const THINKING_MS_PER_CHAR = 15;
const MAX_THINKING_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const THEMES = {
  light: {
    bg: "#ffffff",
    headerBg: "#ffffff",
    inputBarBg: "#ffffff",
    text: "#1a1a1a",
    sub: "#8a8a8a",
    border: "#dfe3ea",
    divider: "#eceef1",
    inputBg: "#f6f7f9",
    inputBorder: "#dfe3ea",
    pillBg: "#f2f3f5",
    overlayBg: "#ffffff",
    accent: "#3478f6",
    danger: "#e74c3c",
  },
  dark: {
    bg: "#191a1e",
    headerBg: "#191a1e",
    inputBarBg: "#191a1e",
    text: "#ececec",
    sub: "#8f8f96",
    border: "#2c2d33",
    divider: "#26272c",
    inputBg: "#232428",
    inputBorder: "#2c2d33",
    pillBg: "#232428",
    overlayBg: "#191a1e",
    accent: "#5b9dff",
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

  useEffect(() => {
    const unsub = window.electronAPI?.onChatContext?.((text: string) => {
      if (!text?.trim()) return;
      usePetStore.getState().setPendingSelectionContext(text);
      injectContextMessage(text);
    });
    return () => unsub?.();
  }, []);

  // Skill results and background confirmation replies land in the DB
  // outside of sendQuery()'s own await chain — this is what picks them up.
  useEffect(() => {
    const unsub = EventBus.on?.("chat:updated", () => loadHistory());
    return () => unsub?.();
  }, []);

  // Main process asks the chat window to confirm a medium/high-risk skill
  // before it runs. Surface it as a message and arm pendingConfirmation so
  // the next thing the user types is read as yes/no, not a new request.
  useEffect(() => {
    const unsub = window.electronAPI?.onSkillConfirmRequest?.((payload: SkillConfirmRequest) => {
      usePetStore.getState().setPendingConfirmation({
        requestId: payload.requestId,
        skillId: payload.skillId,
        title: payload.title,
      });
      const previewLine = payload.preview?.message ? `\n\n${payload.preview.message}` : "";
      DatabaseService.addMessage({
        id: crypto.randomUUID(),
        sessionId: usePetStore.getState().sessionId,
        role: "assistant",
        content: `Before I do "${payload.title}" (risk: ${payload.risk}):${previewLine}\n\nShould I go ahead? (yes/no)`,
        timestamp: Date.now(),
      }).then(loadHistory);
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

    const targetThinkingMs = Math.min(
      MAX_THINKING_MS,
      MIN_THINKING_MS + textToSend.length * THINKING_MS_PER_CHAR,
    );
    const startedAt = Date.now();

    try {
      await chatControllerSingleton.handleSendPrompt(textToSend);

      const elapsed = Date.now() - startedAt;
      if (elapsed < targetThinkingMs) {
        await sleep(targetThinkingMs - elapsed);
      }

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
        borderRadius: isFullscreen ? 0 : "10px",
        border: isFullscreen ? "none" : `1px solid ${c.border}`,
        overflow: "hidden",
        boxShadow: isFullscreen ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
        color: c.text,
        fontFamily: SANS,
        transition: "background 0.2s, color 0.2s, border-radius 0.15s",
      }}
      onMouseEnter={() => window.electronAPI?.setChatIgnoreMouseEvents(false)}
      onMouseLeave={() => window.electronAPI?.setChatIgnoreMouseEvents(true)}
    >
      <style>{`
        html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>

      <div
        style={{
          padding: "10px 14px",
          background: c.headerBg,
          borderBottom: `1px solid ${c.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: "0.88rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pet.name}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              color: c.sub,
              background: c.pillBg,
              padding: "2px 7px",
              borderRadius: "999px",
              flexShrink: 0,
            }}
          >
            Lvl {pet.level}
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{ ...headerIconBtn, color: isFullscreen ? c.accent : c.sub }}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <IconExpand />
          </button>
          <button
            onClick={() => window.electronAPI?.createSettingsWindow()}
            style={{ ...headerIconBtn, color: showSettings ? c.accent : c.sub }}
            title="Settings"
          >
            <IconGear />
          </button>
          <button
            onClick={() => window.electronAPI?.closeChatWindow()}
            style={{ ...headerIconBtn, color: c.sub }}
            title="Close Panel"
          >
            <IconClose />
          </button>
        </div>
      </div>

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

      <form
        onSubmit={handleSubmit}
        style={{
          padding: "10px 14px",
          background: c.inputBarBg,
          borderTop: `1px solid ${c.divider}`,
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexShrink: 0,
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
            borderRadius: "8px",
            padding: "8px 12px",
            color: c.text,
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          style={{
            background: loading || !inputText.trim() ? c.pillBg : c.accent,
            color: loading || !inputText.trim() ? c.sub : "#fff",
            border: "none",
            borderRadius: "8px",
            width: "34px",
            height: "34px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconSend />
        </button>
      </form>
    </div>
  );
};

const headerIconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  padding: 0,
};

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconExpand = () => (
  <svg {...iconProps}>
    <path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
  </svg>
);
const IconGear = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
  </svg>
);
const IconClose = () => (
  <svg {...iconProps} width={13} height={13}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const IconSend = () => (
  <svg {...iconProps} width={15} height={15} stroke="none" fill="currentColor">
    <path d="M3 11l18-8-8 18-2-8-8-2z" />
  </svg>
);

export default ChatWindow;
