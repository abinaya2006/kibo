import type { PetState, PetMood } from '../models/types';

// ─── Speech Service ────────────────────────────────────────────────────────────
// Returns random contextual speech strings based on the pet's current state/mood.
// Each entry has a weight — higher weight = more likely to be selected.

interface SpeechEntry {
  text:   string;
  weight: number;
}

const SPEECH_MAP: Partial<Record<PetState, SpeechEntry[]>> = {
  idle: [
    { text: '...',          weight: 3 },
    { text: '*yawns*',      weight: 2 },
    { text: 'Hmm...',       weight: 2 },
    { text: '(o_o)',         weight: 1 },
    { text: '*stretches*',  weight: 1 },
    { text: 'La la~',       weight: 1 },
  ],
  walking: [
    { text: 'Off I go!',    weight: 2 },
    { text: '🐾🐾',         weight: 2 },
    { text: 'Exploring~',   weight: 1 },
    { text: 'La la la~',   weight: 2 },
  ],
  sleeping: [
    { text: 'Zzz...',             weight: 5 },
    { text: 'Zzzz~',             weight: 3 },
    { text: '*snores softly*',    weight: 2 },
    { text: '💤',                weight: 3 },
  ],
  happy: [
    { text: 'Yay!',          weight: 3 },
    { text: '✨',             weight: 2 },
    { text: 'So happy!',     weight: 2 },
    { text: 'Wheee~',        weight: 2 },
    { text: '❤️',            weight: 1 },
    { text: 'This is fun!',  weight: 2 },
  ],
  curious: [
    { text: "What's that?", weight: 3 },
    { text: 'Hmm?',         weight: 3 },
    { text: '👀',           weight: 2 },
    { text: 'Oh!',          weight: 2 },
    { text: 'Interesting.', weight: 1 },
  ],
  followingCursor: [
    { text: 'Wait for me!', weight: 3 },
    { text: 'Coming!',      weight: 2 },
    { text: '♪~',          weight: 2 },
    { text: 'Hey!',         weight: 1 },
  ],
  chasingCursor: [
    { text: 'Hey!! >',    weight: 3 },
    { text: 'Come back!', weight: 3 },
    { text: 'Too fast!',  weight: 2 },
    { text: '😤',        weight: 1 },
  ],
  playing: [
    { text: 'Fun fun fun!',  weight: 3 },
    { text: 'Again! Again!', weight: 2 },
    { text: 'Woo!',          weight: 2 },
    { text: 'I love this!',  weight: 1 },
  ],
  beingDragged: [
    { text: 'Woah!',    weight: 3 },
    { text: '(o_O)',    weight: 2 },
    { text: 'Wheeee!', weight: 2 },
    { text: '!!!',     weight: 1 },
  ],
  eating: [
    { text: 'Nom nom~',      weight: 3 },
    { text: 'Yummy!',        weight: 2 },
    { text: '*munch munch*', weight: 2 },
    { text: 'Delicious!',    weight: 1 },
  ],
  thinking: [
    { text: 'Hmm...',          weight: 3 },
    { text: 'Let me think...', weight: 2 },
    { text: '🤔',             weight: 2 },
  ],
};

const MOOD_OVERRIDES: Partial<Record<PetMood, string[]>> = {
  bored:  ['*sighs*', 'So bored...', 'Nothing to do...', 'Hello? 👋'],
  sad:    ['*sniffles*', 'I miss you.', 'Play with me...'],
  sleepy: ['So sleepy...', '*yawns widely*', 'Need nap...'],
};

function weightedPick(pool: SpeechEntry[]): string {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry.text;
  }
  return pool[pool.length - 1].text;
}

export const SpeechService = {
  /**
   * Returns a random speech string or null (silent).
   * @param probability 0–1 chance of speaking at all (default 0.3)
   */
  getSpeech(state: PetState, mood: PetMood, probability = 0.3): string | null {
    if (Math.random() > probability) return null;

    // Mood override (30% chance when mood is extreme)
    const moodPool = MOOD_OVERRIDES[mood];
    if (moodPool && Math.random() < 0.35) {
      return moodPool[Math.floor(Math.random() * moodPool.length)];
    }

    const pool = SPEECH_MAP[state] ?? SPEECH_MAP['idle'] ?? [];
    return pool.length > 0 ? weightedPick(pool) : null;
  },
};
