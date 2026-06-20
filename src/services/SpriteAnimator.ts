// ─── Sprite Sheet Animator ─────────────────────────────────────────────────────
// Handles frame-by-frame animation from a sprite sheet using CSS background-position

export interface FrameDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimationDef {
  frames: FrameDef[];
  fps: number;
  loop: boolean;
}

export class SpriteAnimator {
  private animations: Map<string, AnimationDef> = new Map();
  private currentAnim: string = "idle";
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private listeners: Set<() => void> = new Set();

  register(name: string, anim: AnimationDef) {
    this.animations.set(name, anim);
  }

  play(name: string) {
    const anim = this.animations.get(name);
    if (!anim) {
      console.warn(`[SpriteAnimator] Animation "${name}" not registered`);
      return;
    }
    if (this.currentAnim === name) return;

    this.currentAnim = name;
    this.currentFrame = 0;
    this.lastFrameTime = performance.now();
    this.notify();
  }

  update(now: number) {
    const anim = this.animations.get(this.currentAnim);
    if (!anim || anim.frames.length === 0) return;

    // Nothing to animate on single-frame animations
    if (anim.frames.length === 1) return;

    const interval = 1000 / anim.fps;
    if (now - this.lastFrameTime < interval) return;

    this.lastFrameTime = now;

    if (this.currentFrame < anim.frames.length - 1) {
      this.currentFrame++;
    } else if (anim.loop) {
      this.currentFrame = 0;
    }

    this.notify();
  }

  getCurrentFrame(): FrameDef | null {
    const anim = this.animations.get(this.currentAnim);
    if (!anim || anim.frames.length === 0) return null;

    // Defensive clamp — never index out of bounds even mid-transition
    const safeIndex = Math.min(this.currentFrame, anim.frames.length - 1);
    return anim.frames[safeIndex] ?? null;
  }

  onFrame(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}
