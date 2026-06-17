import { EMOTION_TICK_INTERVAL, BOREDOM_START_AFTER } from '../models/PetConfig';
import { usePetStore } from '../state/usePetStore';

export class EmotionManager {
  private intervalId: number | null = null;

  start() {
    this.stop();
    // @ts-ignore - NodeJS vs Window Timeout typing conflict
    this.intervalId = setInterval(this.tickEmotions, EMOTION_TICK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tickEmotions = () => {
    const store = usePetStore.getState();
    const { state, emotions, lastInteraction } = store.pet;
    const now = Date.now();
    const idleTime = now - lastInteraction;

    let { happiness, energy, excitement, boredom, hunger, social } = emotions;

    // 1. Sleeping vs Waking Energy
    if (state === 'sleeping') {
      energy = Math.min(100, energy + 8);
      excitement = Math.max(0, excitement - 5);
      boredom = Math.max(0, boredom - 2);
    } else {
      // Waking uses energy, hunger grows over time, social decays
      const stateDrain = state === 'running' || state === 'chasingCursor' ? 4 : 1.5;
      energy = Math.max(0, energy - stateDrain);
      hunger = Math.max(0, hunger - 1);
      social = Math.max(0, social - 1);

      // Boredom grows if not interacted with
      if (idleTime > BOREDOM_START_AFTER) {
        boredom = Math.min(100, boredom + 3);
        happiness = Math.max(0, happiness - 1.5);
      }
    }

    // 2. State-based Emotional adjustments
    if (state === 'happy') {
      happiness = Math.min(100, happiness + 2);
    } else if (state === 'chasingCursor' || state === 'followingCursor') {
      excitement = Math.min(100, excitement + 4);
      boredom = Math.max(0, boredom - 6);
    }

    // 3. Natural Excitement Decay
    if (state !== 'chasingCursor' && state !== 'followingCursor' && state !== 'playing') {
      excitement = Math.max(0, excitement - 2.5);
    }

    // Apply updates
    store.setEmotions({ happiness, energy, excitement, boredom, hunger, social });
  };
}
