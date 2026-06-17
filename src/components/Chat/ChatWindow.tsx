import React, { useState, useEffect } from "react";
import { usePetStore } from "../../state/usePetStore";
import { DatabaseService } from "../../services/DatabaseService";
import { chatControllerSingleton } from "../../controllers/ChatController";
import { MessageList } from "./MessageList";
import { VoiceInput } from "./VoiceInput";
import { EventBus } from "../../services/EventBus";
import { VoiceManager } from "../../services/VoiceManager";
import type { DatabaseMessage } from "../../models/types";

export const ChatWindow: React.FC = () => {
  const store = usePetStore();
  const { apiConfig, voiceConfig, sessionId, pet } = store;

  const [messages, setMessages] = useState<DatabaseMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Voice Recording / Transcription States
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Load message logs on session initialization
  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  // Capture selection capture notifications from EventBus or direct IPC selection channel
  useEffect(() => {
    const unsub = EventBus.on("selection:captured", (text: string) => {
      handleCapturedText(text);
    });

    if (window.electronAPI) {
      const unsubIPC = window.electronAPI.onSelectionCaptured((text) => {
        handleCapturedText(text);
      });
      return () => {
        unsub();
        unsubIPC();
      };
    }

    return unsub;
  }, [sessionId]);

  useEffect(() => {
    window.electronAPI?.setChatIgnoreMouseEvents(false);
  }, []);

  const loadHistory = async () => {
    const history = await DatabaseService.getHistory(sessionId);
    setMessages(history);
  };

  const handleCapturedText = (text: string) => {
    // Fill text field but do not send immediately, let user choose "Read Aloud" or "Ask AI"
    setInputText(`Selected text:\n"${text}"`);
  };

  const handleReadAloud = async () => {
    if (!inputText.trim()) return;
    try {
      await VoiceManager.speak(inputText, voiceConfig, apiConfig.apiKey, true);
    } catch (err) {
      console.error("Failed to read aloud:", err);
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

  const handleToggleRecording = async () => {
    if (recording) {
      // Stop
      setRecording(false);
      setTranscribing(true);
      try {
        const text = await chatControllerSingleton.stopVoiceRecording();
        setTranscribing(false);
        if (text.trim()) {
          setInputText(text);
          sendQuery(text);
        }
      } catch (err: any) {
        setTranscribing(false);
        alert(err.message || "Failed processing recording.");
      }
    } else {
      // Start
      try {
        await chatControllerSingleton.startVoiceRecording();
        setRecording(true);
      } catch (err: any) {
        alert(err.message || "Could not access microphone.");
      }
    }
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
        width: "100%",
        height: "100%",
        background: "#151520",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        color: "#ffffff",
        fontFamily: "'Outfit', sans-serif",
      }}
      onMouseEnter={() => window.electronAPI?.setChatIgnoreMouseEvents(false)}
      onMouseLeave={() => window.electronAPI?.setChatIgnoreMouseEvents(true)}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "14px 18px",
          background: "#1e1e2d",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
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
                    : "#3498db",
            }}
          />
          <span style={{ fontWeight: 650, fontSize: "0.95rem" }}>
            {pet.name} AI Companion
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#7f8c8d",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "2px 6px",
              borderRadius: "8px",
            }}
          >
            Lvl {pet.level}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => window.electronAPI?.createSettingsWindow()}
            style={{
              background: "none",
              border: "none",
              color: showSettings ? "#3498db" : "#95a5a6",
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
              color: "#95a5a6",
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

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Messages */}
        <MessageList messages={messages} />

        {/* Settings slide overlay */}
        {showSettings && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "#151522",
              zIndex: 100,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                  color: "#e74c3c",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Close
              </button>
            </div>

            {/* AI Provider Config */}
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
                  background: "#2c2c3d",
                  border: "1px solid #444",
                  color: "#fff",
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="gemini-2.0-flash">
                  Google Gemini 2.0 Flash
                </option>
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
                    background: "#2c2c3d",
                    border: "1px solid #444",
                    color: "#fff",
                    padding: "6px",
                    borderRadius: "6px",
                  }}
                />
              </label>
            </div>

            {/* Voice Preferences */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
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
                  background: "#2c2c3d",
                  border: "1px solid #444",
                  color: "#fff",
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

            {/* System Clear Memory Button */}
            <div
              style={{
                marginTop: "auto",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: "12px",
              }}
            >
              <button
                onClick={handleClearChat}
                style={{
                  width: "100%",
                  background: "#e74c3c",
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

      {/* Input controls footer */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "12px 16px",
          background: "#1c1c28",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <VoiceInput
          isRecording={recording}
          isTranscribing={transcribing}
          onToggleRecording={handleToggleRecording}
        />

        <input
          type="text"
          value={inputText}
          disabled={loading || recording}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={recording ? "Speak now..." : "Ask companion..."}
          style={{
            flex: 1,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "8px 16px",
            color: "#fff",
            fontSize: "0.85rem",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={handleReadAloud}
          disabled={!inputText.trim() || recording}
          style={{
            background: !inputText.trim()
              ? "rgba(255, 255, 255, 0.05)"
              : "#9b59b6",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
          }}
          title="Read Aloud"
        >
          🔊
        </button>

        <button
          type="submit"
          disabled={loading || !inputText.trim() || recording}
          style={{
            background:
              loading || !inputText.trim()
                ? "rgba(255, 255, 255, 0.05)"
                : "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "34px",
            height: "34px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ➔
        </button>
      </form>
    </div>
  );
};
export default ChatWindow;
