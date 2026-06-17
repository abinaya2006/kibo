import type { CursorData, Vec2 } from '../models/types';
import {
  NEARBY_RADIUS,
  CIRCLE_THRESHOLD_RADIANS,
  CIRCLE_DETECTION_MS,
  DWELL_MOVEMENT_THRESHOLD,
} from '../models/PetConfig';
import { EventBus } from '../services/EventBus';

export class CursorTracker {
  private data: CursorData = {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    speed: 0,
    distanceToPet: Infinity,
    angleToPet: 0,
    isNearby: false,
    isCircling: false,
    dwellTime: 0,
    lastSeen: Date.now(),
  };

  private history: Array<{ pos: Vec2; time: number }> = [];
  private lastDwellPos: Vec2 | null = null;
  private lastDwellTime: number = Date.now();

  constructor() {
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  destroy() {
    window.removeEventListener('mousemove', this.handleMouseMove);
  }

  getData(): CursorData {
    return { ...this.data };
  }

  private handleMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    const currentPos: Vec2 = { x: e.clientX, y: e.clientY };

    this.history.push({ pos: currentPos, time: now });
    // Keep 2 seconds of history for velocity smoothing and circle detection
    const twoSecondsAgo = now - CIRCLE_DETECTION_MS;
    this.history = this.history.filter((h) => h.time >= twoSecondsAgo);

    // Calculate instantaneous / smoothed velocity
    this.updateVelocity(now, currentPos);

    // Dwell tracker
    this.updateDwell(now, currentPos);

    this.data.position = currentPos;
    this.data.lastSeen = now;

    // Trigger update calculation involving the pet position (done by PetController)
    EventBus.emit('cursor:moved', this.data);
  };

  updateRelativeData(petCenter: Vec2) {
    const curPos = this.data.position;
    const dx = curPos.x - petCenter.x;
    const dy = curPos.y - petCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.data.distanceToPet = dist;
    this.data.angleToPet = Math.atan2(dy, dx);
    this.data.isNearby = dist <= NEARBY_RADIUS;

    // Check circling
    this.data.isCircling = this.checkCircling(petCenter);
  }

  private updateVelocity(now: number, currentPos: Vec2) {
    if (this.history.length < 2) return;

    // Find a state about 100ms ago for smooth velocity
    const targetTime = now - 100;
    let fallback = this.history[0];
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].time <= targetTime) {
        fallback = this.history[i];
        break;
      }
    }

    const dt = (now - fallback.time) / 1000; // seconds
    if (dt <= 0) return;

    const dx = currentPos.x - fallback.pos.x;
    const dy = currentPos.y - fallback.pos.y;
    const vx = dx / dt;
    const vy = dy / dt;

    this.data.velocity = { x: vx, y: vy };
    this.data.speed = Math.sqrt(vx * vx + vy * vy);
  }

  private updateDwell(now: number, currentPos: Vec2) {
    if (!this.lastDwellPos) {
      this.lastDwellPos = currentPos;
      this.lastDwellTime = now;
      this.data.dwellTime = 0;
      return;
    }

    const dx = currentPos.x - this.lastDwellPos.x;
    const dy = currentPos.y - this.lastDwellPos.y;
    const distMoved = Math.sqrt(dx * dx + dy * dy);

    if (distMoved > DWELL_MOVEMENT_THRESHOLD) {
      // Cursor moved too much, reset dwell baseline
      this.lastDwellPos = currentPos;
      this.lastDwellTime = now;
      this.data.dwellTime = 0;
    } else {
      this.data.dwellTime = now - this.lastDwellTime;
    }
  }

  private checkCircling(petCenter: Vec2): boolean {
    if (this.history.length < 5) return false;

    // Calculate angular velocity accumulated over history
    let totalAngleDelta = 0;
    let prevAngle = 0;
    let hasPrev = false;

    for (const point of this.history) {
      const dx = point.pos.x - petCenter.x;
      const dy = point.pos.y - petCenter.y;
      const angle = Math.atan2(dy, dx);

      if (hasPrev) {
        let diff = angle - prevAngle;
        // Normalize angle difference to [-PI, PI]
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        totalAngleDelta += diff;
      }

      prevAngle = angle;
      hasPrev = true;
    }

    // Checking if we accumulated more than CIRCLE_THRESHOLD_RADIANS (approx. 270 degrees)
    return Math.abs(totalAngleDelta) >= CIRCLE_THRESHOLD_RADIANS;
  }
}
