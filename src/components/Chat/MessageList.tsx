import React, { useEffect, useRef } from 'react';
import type { DatabaseMessage } from '../../models/types';

interface MessageListProps {
  messages: DatabaseMessage[];
  onSpeak: (text: string) => void;
  speakingId: string | null;
}

// Strips emoji so TTS doesn't try to read out symbol names
export const stripEmoji = (text: string) =>
  text
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSpeak,
  speakingId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      {/* Scoped scrollbar styling — can't be done with inline styles */}
      <style>{`
        .kibo-message-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .kibo-message-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .kibo-message-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
        }
        .kibo-message-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.22);
        }
        .kibo-message-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
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
          gap: '12px',
          background: '#1a1a24',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: '#7f8c8d',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.9rem',
              maxWidth: '220px',
            }}
          >
            💬 Ask me a question, tap the microphone to chat, or highlight text anywhere and press Alt+Shift+A!
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingId === msg.id;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
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
                      background: isUser ? '#3498db' : '#2d2d3d',
                      color: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: isUser
                        ? '16px 16px 2px 16px'
                        : '16px 16px 16px 2px',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {msg.content}
                  </div>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => onSpeak(msg.content)}
                      title="Read aloud"
                      style={{
                        flexShrink: 0,
                        background: isSpeaking
                          ? 'rgba(155, 89, 182, 0.3)'
                          : 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        color: isSpeaking ? '#c9a3d9' : '#8f8fa0',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      🔊
                    </button>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: '#5f5f6d',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    padding: '0 4px',
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
      </div>
    </>
  );
};

export default MessageList;
