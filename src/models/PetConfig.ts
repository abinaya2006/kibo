// ─── Species Definitions ──────────────────────────────────────────────────────

export interface SpeciesConfig {
  species:              string;
  displayName:          string;
  baseSpeed:            number;
  curiosityRadius:      number;
  roamInterval:         [number, number]; // [min, max] ms between roam decisions
  idleChance:           number;           // 0–1 probability of staying idle
  sleepEnergyThreshold: number;
  primaryColor:         string;
  accentColor:          string;
}

export const SPECIES_CONFIGS: Record<string, SpeciesConfig> = {
  cat: {
    species:              'cat',
    displayName:          'Cat',
    baseSpeed:            60,
    curiosityRadius:      160,
    roamInterval:         [3000, 8000],
    idleChance:           0.4,
    sleepEnergyThreshold: 20,
    primaryColor:         '#FFBB8C',
    accentColor:          '#FF8DA1',
  },
  dog: {
    species:              'dog',
    displayName:          'Dog',
    baseSpeed:            90,
    curiosityRadius:      220,
    roamInterval:         [2000, 5000],
    idleChance:           0.15,
    sleepEnergyThreshold: 15,
    primaryColor:         '#C8A882',
    accentColor:          '#8B6F4E',
  },
  bunny: {
    species:              'bunny',
    displayName:          'Bunny',
    baseSpeed:            70,
    curiosityRadius:      110,
    roamInterval:         [4000, 10000],
    idleChance:           0.5,
    sleepEnergyThreshold: 25,
    primaryColor:         '#F0F0F0',
    accentColor:          '#FFB3BA',
  },
};

export const DEFAULT_SPECIES = 'cat';

// ─── Behavioral Constants ─────────────────────────────────────────────────────

/** px — cursor within this triggers curiosity */
export const NEARBY_RADIUS = 160;

/** px — cursor within this triggers follow/stop */
export const APPROACH_RADIUS = 70;

/** px/s — cursor faster than this triggers chase */
export const FAST_CURSOR_SPEED = 550;

/** Cumulative radians swept in CIRCLE_DETECTION_MS to detect circling (270°) */
export const CIRCLE_THRESHOLD_RADIANS = Math.PI * 1.5;

/** ms window used to measure circling */
export const CIRCLE_DETECTION_MS = 2000;

/** ms cursor stays near pet without much movement before pet approaches */
export const DWELL_THRESHOLD = 3000;

/** px movement budget before dwell resets */
export const DWELL_MOVEMENT_THRESHOLD = 12;

/** ms between emotion decay ticks */
export const EMOTION_TICK_INTERVAL = 10_000;

/** ms between auto-saves */
export const SAVE_INTERVAL_MS = 30_000;

/** px — pet sprite render size */
export const PET_SIZE = 100;

/** px — minimum screen margin for roaming */
export const SCREEN_MARGIN = 60;

/** ms of no interaction before pet starts getting bored */
export const BOREDOM_START_AFTER = 30_000;
