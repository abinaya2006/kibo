import React from 'react';
import { motion } from 'framer-motion';

interface VoiceInputProps {
  isRecording:  boolean;
  isTranscribing: boolean;
  onToggleRecording: () => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  isRecording,
  isTranscribing,
  onToggleRecording,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Animated pulsing wave bars */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: '4px',
                height: '14px',
                background: '#e74c3c',
                borderRadius: '2px',
              }}
              animate={{
                scaleY: [1, 2.2, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
          <span style={{ fontSize: '0.75rem', color: '#e74c3c', marginLeft: '4px', fontWeight: 550 }}>
            Listening...
          </span>
        </div>
      )}

      {isTranscribing && (
        <span style={{ fontSize: '0.75rem', color: '#f1c40f', fontWeight: 550 }}>
          Processing voice...
        </span>
      )}

      <button
        type="button"
        onClick={onToggleRecording}
        disabled={isTranscribing}
        style={{
          border: 'none',
          background: isRecording ? '#e74c3c' : 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          cursor: isTranscribing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          transition: 'background 0.2s',
        }}
        title="Voice Chat"
      >
        🎙️
      </button>
    </div>
  );
};
export default VoiceInput;
