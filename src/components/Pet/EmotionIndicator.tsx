import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PetMood } from '../../models/types';

interface EmotionIndicatorProps {
  mood: PetMood;
}

const EMOJI_MAP: Record<PetMood, string> = {
  happy:   '❤️',
  excited: '✨',
  neutral: '💬',
  sleepy:  '💤',
  bored:   '💭',
  curious: '❓',
  sad:     '💧',
  hungry:  '🍖',
};

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({ mood }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-24px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 90,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ opacity: 0, y: 8, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.5 }}
          transition={{ type: 'spring', damping: 12, stiffness: 220 }}
          style={{
            fontSize: '1.2rem',
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.15))',
          }}
        >
          {EMOJI_MAP[mood]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
