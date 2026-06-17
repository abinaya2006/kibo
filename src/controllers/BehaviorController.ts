import type { CursorData } from '../models/types';
import { usePetStore } from '../state/usePetStore';
import {
  FAST_CURSOR_SPEED,
  DWELL_THRESHOLD,
  PET_SIZE,
} from '../models/PetConfig';

export class BehaviorController {
  private lastPatTime = 0;

  interpretCursorBehavior(cursor: CursorData) {
    const store = usePetStore.getState();
    const { pet } = store;

    // Dragging or AI interaction states override standard cursor interpretations
    if (
      pet.state === 'beingDragged' ||
      pet.state === 'listening' ||
      pet.state === 'thinking' ||
      pet.state === 'speaking'
    ) {
      return;
    }

    const currentEnergy = pet.emotions.energy;

    // 1. Inactive / Sleep triggers
    if (currentEnergy < 10 && pet.state !== 'sleeping') {
      store.setPetStateDirect('sleeping');
      store.setTargetPosition(null);
      store.setVelocity({ x: 0, y: 0 });
      return;
    }

    if (pet.state === 'sleeping') {
      // Wake up if clicked or if cursor is extremely close and energy > 30
      if (cursor.isNearby && cursor.distanceToPet < 40 && currentEnergy > 30) {
        store.setPetStateDirect('idle');
      }
      return;
    }

    // 2. High-speed Cursor Chase Behavior
    if (cursor.isNearby && cursor.speed > FAST_CURSOR_SPEED) {
      if (pet.state !== 'chasingCursor') {
        store.setPetStateDirect('chasingCursor');
      }
      // Set target directly to cursor position (subtract offset to center pet on cursor)
      const targetPos = {
        x: cursor.position.x - PET_SIZE / 2,
        y: cursor.position.y - PET_SIZE / 2,
      };
      store.setTargetPosition(targetPos);
      store.touchInteraction();
      return;
    }

    // 3. Circling Excitement Behavior
    if (cursor.isNearby && cursor.isCircling) {
      if (pet.state !== 'happy') {
        store.setPetStateDirect('happy');
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
      store.touchInteraction();
      return;
    }

    // 4. Cursor Nearby Curiosity / Dwell interaction
    if (cursor.isNearby) {
      if (cursor.dwellTime > DWELL_THRESHOLD) {
        // Dwell: Cursor is still. Pet approaches cursor.
        if (pet.state !== 'followingCursor') {
          store.setPetStateDirect('followingCursor');
        }
        store.setTargetPosition({
          x: cursor.position.x - PET_SIZE / 2,
          y: cursor.position.y - PET_SIZE / 2,
        });
      } else {
        // Just nearby: Pet gets curious
        if (pet.state === 'idle' || pet.state === 'walking') {
          store.setPetStateDirect('curious');
          store.setTargetPosition(null);
          store.setVelocity({ x: 0, y: 0 });
        }
      }
      return;
    }

    // 5. Cursor Leaves / Return to roaming
    if (!cursor.isNearby) {
      if (
        pet.state === 'followingCursor' ||
        pet.state === 'chasingCursor' ||
        pet.state === 'curious'
      ) {
        store.setPetStateDirect('idle');
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
    }
  }

  handlePetClick() {
    const store = usePetStore.getState();
    const { pet } = store;

    if (pet.state === 'sleeping') {
      store.setPetStateDirect('idle');
      store.touchInteraction();
      return;
    }

    // Clicking switches to a happy/play state
    store.setPetStateDirect('happy');
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
    store.touchInteraction();
  }

  handlePetPat() {
    const now = Date.now();
    if (now - this.lastPatTime < 800) return; // rate limit pat logs
    this.lastPatTime = now;

    const store = usePetStore.getState();
    store.touchInteraction();
  }
}
