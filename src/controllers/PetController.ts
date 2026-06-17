import { CursorTracker } from './CursorTracker';
import { BehaviorController } from './BehaviorController';
import { MovementController } from './MovementController';
import { EmotionManager } from './EmotionManager';
import { usePetStore } from '../state/usePetStore';
import { EventBus } from '../services/EventBus';
import { StorageService } from '../services/StorageService';
import { SAVE_INTERVAL_MS, PET_SIZE } from '../models/PetConfig';

export class PetController {
  public cursorTracker: CursorTracker;
  public behaviorController: BehaviorController;
  public movementController: MovementController;
  public emotionManager: EmotionManager;

  private active = false;
  private saveIntervalId: number | null = null;
  private unsubs: Array<() => void> = [];

  constructor() {
    this.cursorTracker = new CursorTracker();
    this.behaviorController = new BehaviorController();
    this.movementController = new MovementController();
    this.emotionManager = new EmotionManager();
  }

  async init() {
    const store = usePetStore.getState();

    // 1. Initialise screen bounds
    if (window.electronAPI) {
      const size = await window.electronAPI.getScreenSize();
      store.setScreenSize(size);
    }

    // 2. Load pet profile from disk/electron-store
    const stored = await StorageService.loadPet();
    if (stored) {
      const pet = store.pet;
      store.setPet({
        ...pet,
        id:              stored.id,
        name:            stored.name,
        species:         stored.species,
        level:           stored.level ?? 1,
        experience:      stored.experience ?? 0,
        relationship:    stored.relationship ?? 0,
        personality:     stored.personality ?? 'playful',
        mood:            stored.mood,
        lastInteraction: stored.lastInteraction,
        createdAt:       stored.createdAt,
        emotions: {
          ...pet.emotions,
          happiness: stored.happiness,
          energy:    stored.energy,
          hunger:    stored.hunger ?? 80,
          social:    stored.social ?? 80,
        },
        physics: {
          ...pet.physics,
          position: stored.position,
        },
      });
    }
    store.setLoaded(true);

    // 3. Connect event bus listeners
    this.unsubs.push(
      EventBus.on('cursor:moved', () => {
        const petData = usePetStore.getState().pet;
        const petCenter = {
          x: petData.physics.position.x + PET_SIZE / 2,
          y: petData.physics.position.y + PET_SIZE / 2,
        };
        this.cursorTracker.updateRelativeData(petCenter);

        const currentCursor = this.cursorTracker.getData();
        this.behaviorController.interpretCursorBehavior(currentCursor);
      })
    );

    // 4. Capture native OS selection events
    if (window.electronAPI) {
      const unsubSelection = window.electronAPI.onSelectionCaptured((text) => {
        EventBus.emit('selection:captured', text);
      });
      this.unsubs.push(unsubSelection);
    }

    // Start sub-loops
    this.emotionManager.start();
    this.active = true;

    // Start auto-save timer
    // @ts-ignore
    this.saveIntervalId = setInterval(this.savePetData, SAVE_INTERVAL_MS);
  }

  update(now: number) {
    if (!this.active) return;
    this.movementController.update(now);
  }

  savePetData = async () => {
    const store = usePetStore.getState();
    if (store.isLoaded) {
      await StorageService.savePet(store.pet);
    }
  };

  destroy() {
    this.active = false;
    this.cursorTracker.destroy();
    this.emotionManager.stop();
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
    }
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
    this.savePetData();
  }
}
export const petControllerSingleton = new PetController();
