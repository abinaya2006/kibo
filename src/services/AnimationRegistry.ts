import type { PetState } from '../models/types';

// ─── Animation Registry ────────────────────────────────────────────────────────
// Maps each PetState to its animation configuration.
//
// Currently all animations use SVG + Framer Motion (assetPath: null).
// Future upgrade path: set assetPath to a Rive/Spine animation file and update
// PetSprite to render via the appropriate runtime — zero API changes required.

export interface AnimationConfig {
  assetPath: string | null; // null = use inline SVG/Framer Motion
  loop:      boolean;
  duration:  number;  // ms; only meaningful when loop=false
  priority:  number;  // higher = preempts lower during conflicts
}

const REGISTRY: Record<PetState, AnimationConfig> = {
  idle:            { assetPath: null, loop: true,  duration: 0,    priority: 1  },
  walking:         { assetPath: null, loop: true,  duration: 0,    priority: 2  },
  running:         { assetPath: null, loop: true,  duration: 0,    priority: 3  },
  sleeping:        { assetPath: null, loop: true,  duration: 0,    priority: 1  },
  playing:         { assetPath: null, loop: true,  duration: 0,    priority: 4  },
  followingCursor: { assetPath: null, loop: true,  duration: 0,    priority: 3  },
  chasingCursor:   { assetPath: null, loop: true,  duration: 0,    priority: 4  },
  beingDragged:    { assetPath: null, loop: true,  duration: 0,    priority: 10 },
  happy:           { assetPath: null, loop: false, duration: 2000, priority: 5  },
  curious:         { assetPath: null, loop: false, duration: 4000, priority: 3  },
  eating:          { assetPath: null, loop: false, duration: 3000, priority: 6  },
  thinking:        { assetPath: null, loop: false, duration: 5000, priority: 3  },
  yawning:         { assetPath: null, loop: false, duration: 2500, priority: 2  },
  stretches:       { assetPath: null, loop: false, duration: 2000, priority: 2  },
  listening:       { assetPath: null, loop: true,  duration: 0,    priority: 8  },
  speaking:        { assetPath: null, loop: true,  duration: 0,    priority: 9  },
};

export const AnimationRegistry = {
  get:         (state: PetState): AnimationConfig => REGISTRY[state],
  isLooping:   (state: PetState): boolean          => REGISTRY[state].loop,
  hasPriority: (current: PetState, next: PetState): boolean =>
    REGISTRY[next].priority > REGISTRY[current].priority,
};
