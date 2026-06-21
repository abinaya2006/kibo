import type { CursorData } from "../models/types";
import { usePetStore } from "../state/usePetStore";
import {
  FAST_CURSOR_SPEED,
  DWELL_THRESHOLD,
  PET_SIZE,
} from "../models/PetConfig";

export class BehaviorController {
  private lastPatTime = 0;

  interpretCursorBehavior(cursor: CursorData) {
    const store = usePetStore.getState();
    const { pet, roamingEnabled } = store;

    if (!roamingEnabled) return;

    if (
      pet.state === "beingDragged" ||
      pet.state === "listening" ||
      pet.state === "thinking" ||
      pet.state === "speaking"
    ) {
      return;
    }

    const currentEnergy = pet.emotions.energy;

    // Don't force sleep during an active play session — roamingEnabled implies play is active
    // (sleep should only trigger from natural EmotionManager decay, not mid-play)
    // So remove this block entirely from here, or gate it differently:

    // 1. Inactive / Sleep triggers — REMOVED from cursor behavior
    // (sleep is now only triggered by EmotionManager natural decay, not cursor proximity)

    if (pet.state === "sleeping") {
      if (cursor.isNearby && cursor.distanceToPet < 40 && currentEnergy > 30) {
        store.setPetStateDirect("idle");
      }
      return;
    }

    // 2. High-speed Cursor Chase Behavior
    if (cursor.isNearby && cursor.speed > FAST_CURSOR_SPEED) {
      if (pet.state !== "chasingCursor") {
        store.setPetStateDirect("chasingCursor");
      }
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
      if (pet.state !== "happy") {
        store.setPetStateDirect("happy");
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
      store.touchInteraction();
      return;
    }

    // 4. Cursor Nearby Curiosity / Dwell interaction
    if (cursor.isNearby) {
      if (cursor.dwellTime > DWELL_THRESHOLD) {
        if (pet.state !== "followingCursor") {
          store.setPetStateDirect("followingCursor");
        }
        store.setTargetPosition({
          x: cursor.position.x - PET_SIZE / 2,
          y: cursor.position.y - PET_SIZE / 2,
        });
      } else {
        if (pet.state === "idle" || pet.state === "walking") {
          store.setPetStateDirect("curious");
          store.setTargetPosition(null);
          store.setVelocity({ x: 0, y: 0 });
        }
      }
      return;
    }

    // 5. Cursor Leaves / Return to roaming
    if (!cursor.isNearby) {
      if (
        pet.state === "followingCursor" ||
        pet.state === "chasingCursor" ||
        pet.state === "curious"
      ) {
        store.setPetStateDirect("idle");
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });
      }
    }
  }

  handlePetClick() {
    const store = usePetStore.getState();
    const { pet } = store;

    if (pet.state === "sleeping") {
      store.setPetStateDirect("idle");
      store.touchInteraction();
      return;
    }

    // Clicking switches to a happy/play state
    store.setPetStateDirect("happy");
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
