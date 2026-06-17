import type { Vec2 } from '../models/types';
import { SPEED_PRESETS, distance, normalize } from '../models/Pet';
import { SPECIES_CONFIGS, PET_SIZE, SCREEN_MARGIN } from '../models/PetConfig';
import { usePetStore } from '../state/usePetStore';

export class MovementController {
  private lastTime = Date.now();
  private nextRoamTime = 0;

  update(now: number) {
    const store = usePetStore.getState();
    const { pet, screenSize } = store;
    const dt = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;

    if (
      pet.state === 'sleeping' ||
      pet.state === 'beingDragged' ||
      pet.state === 'listening' ||
      pet.state === 'thinking' ||
      pet.state === 'speaking'
    ) {
      return;
    }

    const speciesConfig = SPECIES_CONFIGS[pet.species] || SPECIES_CONFIGS['cat'];
    let currentPos = { ...pet.physics.position };
    let targetPos = pet.physics.targetPosition;

    // Handle roaming target decisions
    if (pet.state === 'walking' || pet.state === 'idle') {
      if (now >= this.nextRoamTime) {
        const isIdle = Math.random() < speciesConfig.idleChance;
        if (isIdle) {
          store.setPetState('idle');
          store.setTargetPosition(null);
          this.scheduleNextRoam(now, speciesConfig.roamInterval);
        } else {
          // Choose a new random coordinate on screen within margins
          const maxX = screenSize.width - PET_SIZE - SCREEN_MARGIN;
          const maxY = screenSize.height - PET_SIZE - SCREEN_MARGIN;
          const nextTarget: Vec2 = {
            x: Math.max(SCREEN_MARGIN, Math.random() * maxX),
            y: Math.max(SCREEN_MARGIN, Math.random() * maxY),
          };
          store.setPetState('walking');
          store.setTargetPosition(nextTarget);
          targetPos = nextTarget;
        }
      }
    }

    // Run physics update if target exists
    if (targetPos) {
      const dist = distance(currentPos, targetPos);
      const currentSpeed = SPEED_PRESETS[pet.state] || speciesConfig.baseSpeed;

      if (dist < 4) {
        // Target reached
        store.setPosition(targetPos);
        store.setTargetPosition(null);
        store.setVelocity({ x: 0, y: 0 });

        if (pet.state === 'walking' || pet.state === 'running') {
          store.setPetState('idle');
          this.scheduleNextRoam(now, speciesConfig.roamInterval);
        } else if (pet.state === 'followingCursor' || pet.state === 'chasingCursor') {
          // Wait at the cursor position
          store.setPetState('idle');
        }
      } else {
        // Linear Interpolated/smoothed movement towards target
        const dir = normalize({ x: targetPos.x - currentPos.x, y: targetPos.y - currentPos.y });
        const stepSize = currentSpeed * dt;

        let nextPos: Vec2;
        if (stepSize >= dist) {
          nextPos = targetPos;
        } else {
          nextPos = {
            x: currentPos.x + dir.x * stepSize,
            y: currentPos.y + dir.y * stepSize,
          };
        }

        store.setPosition(nextPos);
        store.setVelocity({ x: dir.x * currentSpeed, y: dir.y * currentSpeed });
      }
    }
  }

  private scheduleNextRoam(now: number, range: [number, number]) {
    const delay = range[0] + Math.random() * (range[1] - range[0]);
    this.nextRoamTime = now + delay;
  }
}
