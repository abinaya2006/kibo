import React, { useEffect, useRef, useState } from 'react';
import { usePetStore } from '../../state/usePetStore';
import type { DatabaseMessage } from '../../models/types';

interface MessageListProps {
  messages: DatabaseMessage[];
  onSpeak: (text: string) => void;
  speakingId: string | null;
  isThinking?: boolean;
}

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
const MONO = "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

// Same token set as SettingsWindow.tsx — keep in sync with that file
const THEMES = {
  light: {
    bg: '#fbfbfb',
    text: '#0d0d0d',
    sub: '#8a8a8a',
    border: 'rgba(0,0,0,0.08)',
    divider: 'rgba(0,0,0,0.07)',
    bubbleUserBg: '#f0f0f0',
    bubbleUserBorder: 'rgba(0,0,0,0.1)',
    bubbleAssistantBg: '#ffffff',
    bubbleAssistantBorder: 'rgba(0,0,0,0.08)',
    lockedBg: '#f2f2f2',
    lockedBorder: 'rgba(0,0,0,0.1)',
    lockedText: '#4a4a4a',
    dot: '#a8a8a8',
    accentDot: '#0d0d0d',
  },
  dark: {
    bg: '#1c1c1e',
    text: '#f2f2f2',
    sub: '#9a9a9a',
    border: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.08)',
    bubbleUserBg: '#2a2a2d',
    bubbleUserBorder: 'rgba(255,255,255,0.12)',
    bubbleAssistantBg: '#232326',
    bubbleAssistantBorder: 'rgba(255,255,255,0.08)',
    lockedBg: '#242426',
    lockedBorder: 'rgba(255,255,255,0.1)',
    lockedText: '#c8c8c8',
    dot: '#666',
    accentDot: '#f2f2f2',
  },
};

const THINKING_LABELS = ['Thinking', 'Browsing', 'Yosichifying', 'Dollaring', 'Pondering'];

export const stripEmoji = (text: string) =>
  text
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

// Splits "I see you highlighted:\n\n> "..."\n\nWhat would you like to know about it?"
// into a quoted-context panel + the surrounding message text.
const splitQuoted = (content: string) => {
  const match = content.match(/^([\s\S]*?)>\s*"([\s\S]*?)"([\s\S]*)$/);
  if (!match) return null;
  const [, before, quoted, after] = match;
  return { before: before.trim(), quoted: quoted.trim(), after: after.trim() };
};

const ThinkingIndicator: React.FC<{ c: typeof THEMES.dark }> = ({ c }) => {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLabelIndex((i) => (i + 1) % THINKING_LABELS.length);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '7px 12px',
        borderRadius: '8px',
        background: c.lockedBg,
        border: `1px solid ${c.lockedBorder}`,
      }}
    >
      <span
        className="kibo-think-dot"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: c.accentDot,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: SANS,
          fontSize: '0.76rem',
          fontWeight: 500,
          color: c.lockedText,
        }}
      >
        {THINKING_LABELS[labelIndex]}…
      </span>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSpeak,
  speakingId,
  isThinking = false,
}) => {
  const theme = usePetStore((s) => s.theme);
  const c = THEMES[theme];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <>
      <style>{`
        .kibo-message-scroll::-webkit-scrollbar { width: 6px; }
        .kibo-message-scroll::-webkit-scrollbar-track { background: transparent; }
        .kibo-message-scroll::-webkit-scrollbar-thumb {
          background: ${theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'};
          border-radius: 8px;
        }
        .kibo-message-scroll { scrollbar-width: thin; }
        @keyframes kibo-think-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .kibo-think-dot { animation: kibo-think-blink 1s ease-in-out infinite; }
      `}</style>
      <div
        ref={containerRef}
        className="kibo-message-scroll"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: c.bg,
        }}
      >
        {messages.length === 0 && !isThinking ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: c.sub,
              fontFamily: SANS,
              fontSize: '0.85rem',
              maxWidth: '220px',
              lineHeight: 1.5,
            }}
          >
            Ask a question, tap the mic, or highlight text and press Alt+Shift+A.
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingId === msg.id;
            const parts = !isUser ? splitQuoted(msg.content) : null;

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '6px',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    style={{
                      background: isUser ? c.bubbleUserBg : c.bubbleAssistantBg,
                      border: `1px solid ${isUser ? c.bubbleUserBorder : c.bubbleAssistantBorder}`,
                      color: c.text,
                      padding: '9px 13px',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                      fontFamily: SANS,
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                      cursor: 'text',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {parts ? (
                      <>
                        {parts.before && <span>{parts.before}</span>}
                        <div
                          style={{
                            background: c.lockedBg,
                            border: `1px solid ${c.lockedBorder}`,
                            borderRadius: '6px',
                            padding: '7px 10px',
                            fontFamily: MONO,
                            fontSize: '0.76rem',
                            color: c.lockedText,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {parts.quoted}
                        </div>
                        {parts.after && <span>{parts.after}</span>}
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => onSpeak(msg.content)}
                      title="Read aloud"
                      style={{
                        flexShrink: 0,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        color: isSpeaking ? c.text : c.sub,
                        transition: 'color 0.15s',
                      }}
                    >
                      ⏵
                    </button>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    color: c.sub,
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    padding: '0 4px',
                    fontFamily: SANS,
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        {isThinking && <ThinkingIndicator c={c} />}
      </div>
    </>
  );
};

export default MessageList;