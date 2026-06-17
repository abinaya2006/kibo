import React from 'react';
import { motion } from 'framer-motion';
import type { PetState, PetMood } from '../../models/types';
import { SPECIES_CONFIGS } from '../../models/PetConfig';

interface PetSpriteProps {
  species: string;
  state:   PetState;
  mood:    PetMood;
  facing:  'left' | 'right';
}

export const PetSprite: React.FC<PetSpriteProps> = ({ species, state, mood, facing }) => {
  const config = SPECIES_CONFIGS[species] || SPECIES_CONFIGS['cat'];
  const pColor = config.primaryColor;
  const aColor = config.accentColor;

  const isSleeping  = state === 'sleeping';
  const isWalking   = state === 'walking';
  const isRunning   = state === 'running' || state === 'chasingCursor';
  const isCurious   = state === 'curious' || state === 'followingCursor';
  const isHappy     = state === 'happy' || mood === 'excited';

  // AI & Dialog states
  const isListening = state === 'listening';
  const isThinking  = state === 'thinking';
  const isSpeaking  = state === 'speaking';
  const isYawning   = state === 'yawning';
  const isStretching = state === 'stretches';

  // Body animation loops
  const bodyVariants = {
    idle: {
      y: [0, 2, 0],
      scaleY: [1, 0.98, 1],
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
    },
    walk: {
      y: [0, -4, 0],
      rotate: [-3, 3, -3],
      transition: { duration: 0.5, repeat: Infinity, ease: 'linear' as const },
    },
    run: {
      y: [0, -8, 0],
      rotate: [-6, 6, -6],
      scaleX: [1, 1.05, 1],
      transition: { duration: 0.3, repeat: Infinity, ease: 'linear' as const },
    },
    sleep: {
      y: [0, 1.5, 0],
      scaleY: [1, 0.95, 1],
      transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
    },
    stretch: {
      scaleX: [1, 1.25, 1],
      scaleY: [1, 0.8, 1],
      transition: { duration: 2.0, repeat: Infinity, ease: 'easeInOut' },
    },
    thinking: {
      y: [0, -1, 0],
      rotate: [-1, 1, -1],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const getBodyVariant = () => {
    if (isSleeping)   return 'sleep';
    if (isStretching) return 'stretch';
    if (isThinking)   return 'thinking';
    if (isRunning)    return 'run';
    if (isWalking)    return 'walk';
    return 'idle';
  };

  // Eyes variants
  const eyeVariants = {
    idle: { scaleY: 1 },
    blink: {
      scaleY: [1, 0.1, 1],
      transition: { duration: 0.25, repeat: Infinity, repeatDelay: 4 },
    },
  };

  // Ear wiggle loop
  const earVariants = {
    idle: { rotate: 0 },
    wiggle: {
      rotate: [0, -6, 6, 0],
      transition: { duration: 0.4, repeat: Infinity, repeatDelay: 6 },
    },
    listening: {
      rotate: [-3, 3, -3],
      transition: { duration: 0.2, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <motion.div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        transform: `scaleX(${facing === 'left' ? -1 : 1})`,
      }}
    >
      {/* Floating Lightbulb/Gears when thinking */}
      {isThinking && (
        <motion.div
          animate={{ y: [-4, 4, -4], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '-20px',
            left: '42%',
            fontSize: '1.25rem',
            zIndex: 10,
          }}
        >
          💡
        </motion.div>
      )}

      {/* Mic indicator when listening */}
      {isListening && (
        <motion.div
          animate={{ scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '-18px',
            left: '43%',
            fontSize: '1.1rem',
            zIndex: 10,
          }}
        >
          🎙️
        </motion.div>
      )}

      {/* ── Vector Pet Renderer ── */}
      <motion.svg
        viewBox="0 0 100 100"
        style={{ width: '100%', height: '100%' }}
        variants={bodyVariants as any}
        animate={getBodyVariant()}
      >
        {/* Shadow */}
        <ellipse cx="50" cy="88" rx="30" ry="6" fill="rgba(0,0,0,0.12)" />

        {/* Tail */}
        {species === 'cat' && (
          <motion.path
            d="M25,65 Q10,60 15,40 T30,30"
            fill="none"
            stroke={pColor}
            strokeWidth="8"
            strokeLinecap="round"
            animate={{
              rotate: isHappy || isSpeaking ? [0, 20, -20, 0] : [0, 5, -5, 0],
            }}
            transition={{ duration: isHappy || isSpeaking ? 0.5 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '25px', originY: '65px' }}
          />
        )}
        {species === 'dog' && (
          <motion.path
            d="M26,62 Q15,58 12,48"
            fill="none"
            stroke={pColor}
            strokeWidth="7"
            strokeLinecap="round"
            animate={{
              rotate: isHappy || isSpeaking ? [0, 30, -30, 0] : [0, 8, -8, 0],
            }}
            transition={{ duration: isHappy || isSpeaking ? 0.3 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '26px', originY: '62px' }}
          />
        )}
        {species === 'bunny' && (
          <circle cx="25" cy="65" r="8" fill={pColor} />
        )}

        {/* Ears */}
        {species === 'cat' && (
          <>
            <motion.polygon
              points="32,38 38,15 50,32"
              fill={pColor}
              variants={earVariants as any}
              animate={isListening ? 'listening' : 'wiggle'}
              style={{ originX: '38px', originY: '32px' }}
            />
            <motion.polygon
              points="68,38 62,15 50,32"
              fill={pColor}
              variants={earVariants as any}
              animate={isListening ? 'listening' : 'wiggle'}
              style={{ originX: '62px', originY: '32px' }}
            />
          </>
        )}
        {species === 'dog' && (
          <>
            <motion.path
              d="M30,34 Q20,38 24,56 Q28,58 34,42"
              fill={pColor}
              animate={isListening ? { rotate: [-5, 5, -5] } : {}}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <motion.path
              d="M70,34 Q80,38 76,56 Q72,58 66,42"
              fill={pColor}
              animate={isListening ? { rotate: [5, -5, 5] } : {}}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
          </>
        )}
        {species === 'bunny' && (
          <>
            <motion.path
              d="M38,36 Q32,5 44,5 Q50,20 46,36"
              fill={pColor}
              animate={isListening ? { rotate: [-10, 10, -10] } : {}}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <motion.path
              d="M62,36 Q68,5 56,5 Q50,20 54,36"
              fill={pColor}
              animate={isListening ? { rotate: [10, -10, 10] } : {}}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <path d="M39,32 Q36,10 43,10 Q46,20 44,32" fill={aColor} />
            <path d="M61,32 Q64,10 57,10 Q54,20 56,32" fill={aColor} />
          </>
        )}

        {/* Legs / Feet */}
        {!isSleeping && (
          <>
            <motion.ellipse
              cx="40"
              cy="80"
              rx="5"
              ry="8"
              fill={aColor}
              animate={isWalking || isRunning ? { y: [0, -4, 0] } : {}}
              transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.ellipse
              cx="60"
              cy="80"
              rx="5"
              ry="8"
              fill={aColor}
              animate={isWalking || isRunning ? { y: [0, -4, 0] } : {}}
              transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            />
          </>
        )}

        {/* Main Body */}
        <circle cx="50" cy="55" r="26" fill={pColor} />

        {/* Cheek marks */}
        <circle cx="34" cy="58" r="4" fill={aColor} opacity="0.6" />
        <circle cx="66" cy="58" r="4" fill={aColor} opacity="0.6" />

        {/* Eyes */}
        {isSleeping || isYawning ? (
          <>
            <path d="M32,50 Q38,55 40,50" fill="none" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M68,50 Q62,55 60,50" fill="none" stroke="#2c3e50" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : isCurious || isThinking || isListening ? (
          <>
            <circle cx="38" cy="48" r="6.5" fill="#2c3e50" />
            <circle cx="62" cy="48" r="6.5" fill="#2c3e50" />
            <circle cx="40" cy="46" r="2.5" fill="white" />
            <circle cx="64" cy="46" r="2.5" fill="white" />
          </>
        ) : (
          <>
            <motion.circle cx="38" cy="48" r="5" fill="#2c3e50" variants={eyeVariants} animate="blink" />
            <motion.circle cx="62" cy="48" r="5" fill="#2c3e50" variants={eyeVariants} animate="blink" />
          </>
        )}

        {/* Mouth / Nose (animated for yawn and speak states) */}
        {species === 'cat' && (
          <>
            <polygon points="48,53 52,53 50,55" fill="#2c3e50" />
            {isYawning ? (
              <circle cx="50" cy="59" r="3.5" fill="#2c3e50" />
            ) : isSpeaking ? (
              <motion.ellipse
                cx="50"
                cy="58"
                rx="2"
                ry="3"
                fill="#2c3e50"
                animate={{ ry: [1, 3, 1] }}
                transition={{ duration: 0.15, repeat: Infinity }}
              />
            ) : (
              <path d="M46,57 Q50,60 50,57 Q50,60 54,57" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
            )}
          </>
        )}

        {species === 'dog' && (
          <>
            <ellipse cx="50" cy="53" rx="3.5" ry="2.5" fill="#2c3e50" />
            {isYawning ? (
              <circle cx="50" cy="59" r="4.5" fill="#2c3e50" />
            ) : isSpeaking ? (
              <motion.ellipse
                cx="50"
                cy="59"
                rx="2.5"
                ry="3.5"
                fill="#2c3e50"
                animate={{ ry: [1.5, 3.5, 1.5] }}
                transition={{ duration: 0.15, repeat: Infinity }}
              />
            ) : (
              <>
                <path d="M47,57 Q50,59 53,57" fill="none" stroke="#2c3e50" strokeWidth="2" strokeLinecap="round" />
                {isHappy && <path d="M48,58 Q50,65 52,58 Z" fill="#e74c3c" />}
              </>
            )}
          </>
        )}

        {species === 'bunny' && (
          <>
            <polygon points="48,53 52,53 50,54" fill="#2c3e50" />
            {isYawning ? (
              <circle cx="50" cy="58" r="3" fill="#2c3e50" />
            ) : isSpeaking ? (
              <motion.ellipse
                cx="50"
                cy="58"
                rx="1.5"
                ry="2.5"
                fill="#2c3e50"
                animate={{ ry: [1, 2.5, 1] }}
                transition={{ duration: 0.15, repeat: Infinity }}
              />
            ) : (
              <path d="M48,57 Q50,59 52,57" fill="none" stroke="#2c3e50" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </>
        )}
      </motion.svg>
    </motion.div>
  );
};
export default PetSprite;
