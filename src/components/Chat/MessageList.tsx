import React, { useEffect, useRef } from 'react';
import type { DatabaseMessage } from '../../models/types';

interface MessageListProps {
  messages: DatabaseMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
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
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  background: isUser ? '#3498db' : '#2d2d3d',
                  color: '#ffffff',
                  padding: '10px 14px',
                  borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {msg.content}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: '#5f5f6d',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  padding: '0 4px',
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
};
export default MessageList;
