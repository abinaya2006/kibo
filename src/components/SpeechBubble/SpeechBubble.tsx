import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SpeechBubble.css';

interface SpeechBubbleProps {
  text: string | null;
  onClose: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, onClose }) => {
  useEffect(() => {
    if (!text) return;

    // Auto dismiss after 4.5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [text, onClose]);

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className="speech-bubble-container"
          initial={{ opacity: 0, scale: 0.6, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -10 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          <div className="speech-bubble-content">
            <span className="speech-text">{text}</span>
            <button className="speech-bubble-close" onClick={onClose} aria-label="Close bubble">
              ×
            </button>
          </div>
          <div className="speech-bubble-tail" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
