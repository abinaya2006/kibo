import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  PetData,
  PetState,
  PetEmotions,
  Vec2,
  PetMood,
  AIProviderConfig,
  VoiceConfig,
  PetPersonality,
  RareEventData,
} from "../models/types";
import { createDefaultPet, computeMood, canTransition } from "../models/Pet";

export type Theme = "light" | "dark";

// ─── Store Interface ───────────────────────────────────────────────────────────

interface PetStore {
  pet: PetData;
  screenSize: { width: number; height: number };
  isLoaded: boolean;

  // AI & Voice Configurations
  apiConfig: AIProviderConfig;
  voiceConfig: VoiceConfig;
  sessionId: string;

  // Theme (synced across all windows)
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Movement gating
  roamingEnabled: boolean;
  setRoamingEnabled: (enabled: boolean) => void;

  // Selection context for Ask Kibo follow-ups
  pendingSelectionContext: string | null;
  setPendingSelectionContext: (text: string | null) => void;

  // Rare wander events (butterfly, firefly, etc.) — see RareEventController
  rareEvent: RareEventData | null;
  setRareEvent: (event: RareEventData | null) => void;

  // Actions
  setPet: (pet: PetData) => void;
  setPetState: (state: PetState) => void;
  setPetStateDirect: (state: PetState) => void;

  setPosition: (pos: Vec2) => void;
  setVelocity: (vel: Vec2) => void;
  setFacing: (facing: "left" | "right") => void;
  setTargetPosition: (pos: Vec2 | null) => void;
  setEmotions: (emotions: Partial<PetEmotions>) => void;
  setMood: (mood: PetMood) => void;
  setName: (name: string) => void;
  setRelationship: (val: number) => void;
  setPersonality: (personality: PetPersonality) => void;
  setScreenSize: (size: { width: number; height: number }) => void;
  setLoaded: (loaded: boolean) => void;

  setApiConfig: (config: Partial<AIProviderConfig>) => void;
  setVoiceConfig: (config: Partial<VoiceConfig>) => void;
  resetSession: () => void;

  touchInteraction: () => void;
  resetPet: () => void;
}

// ─── Local Storage Loader Helpers ────────────────────────────────────────────────

const loadStoredAPIConfig = (): AIProviderConfig => {
  try {
    const saved = localStorage.getItem("pixel-pet-api-config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed.provider === "gemini" &&
        !parsed.model?.startsWith("gemini-2")
      ) {
        parsed.model = "gemini-2.0-flash";
        localStorage.setItem("pixel-pet-api-config", JSON.stringify(parsed));
      }
      if (parsed.provider === "groq" && !parsed.model) {
        parsed.model = "llama-3.3-70b-versatile";
        localStorage.setItem("pixel-pet-api-config", JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch {}

  return {
    provider: "gemini",
    apiKey: "",
    model: "gemini-2.0-flash",
    temperature: 0.7,
  };
};

const loadStoredVoiceConfig = (): VoiceConfig => {
  try {
    const saved = localStorage.getItem("pixel-pet-voice-config");
    return saved
      ? JSON.parse(saved)
      : {
          ttsProvider: "edge",
          voiceId: "en-US-AriaNeural",
          speed: 1.0,
          enabled: true,
        };
  } catch {
    return {
      ttsProvider: "edge",
      voiceId: "en-US-AriaNeural",
      speed: 1.0,
      enabled: true,
    };
  }
};

const loadStoredTheme = (): Theme => {
  try {
    const saved = localStorage.getItem("pixel-pet-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "light";
};

// ─── Store Implementation ───────────────────────────────────────────────────────

export const usePetStore = create<PetStore>()(
  subscribeWithSelector((set) => ({
    pet: createDefaultPet(),
    screenSize: {
      width: typeof window !== "undefined" ? window.screen.availWidth : 1920,
      height: typeof window !== "undefined" ? window.screen.availHeight : 1080,
    },
    isLoaded: false,

    apiConfig: loadStoredAPIConfig(),
    voiceConfig: loadStoredVoiceConfig(),
    sessionId: crypto.randomUUID(),

    theme: loadStoredTheme(),
    setTheme: (theme) => {
      try {
        localStorage.setItem("pixel-pet-theme", theme);
      } catch {}
      set({ theme });
    },

    roamingEnabled: false,
    setRoamingEnabled: (enabled) => set({ roamingEnabled: enabled }),

    pendingSelectionContext: null,
    setPendingSelectionContext: (text) =>
      set({ pendingSelectionContext: text }),

    rareEvent: null,
    setRareEvent: (event) => set({ rareEvent: event }),

    setPet: (pet) => set({ pet }),

    setPetState: (nextState) =>
      set((s) => {
        if (!canTransition(s.pet.state, nextState)) return {};
        return { pet: { ...s.pet, state: nextState } };
      }),

    setPetStateDirect: (nextState) =>
      set((s) => ({ pet: { ...s.pet, state: nextState } })),

    setPosition: (pos) =>
      set((s) => ({
        pet: { ...s.pet, physics: { ...s.pet.physics, position: pos } },
      })),

    setVelocity: (vel) =>
      set((s) => ({
        pet: {
          ...s.pet,
          physics: {
            ...s.pet.physics,
            velocity: vel,
            facing:
              vel.x < -0.5
                ? "left"
                : vel.x > 0.5
                  ? "right"
                  : s.pet.physics.facing,
          },
        },
      })),

    setFacing: (facing) =>
      set((s) => ({
        pet: { ...s.pet, physics: { ...s.pet.physics, facing } },
      })),

    setTargetPosition: (pos) =>
      set((s) => ({
        pet: { ...s.pet, physics: { ...s.pet.physics, targetPosition: pos } },
      })),

    setEmotions: (emotions) =>
      set((s) => {
        const cur = s.pet.emotions;
        const next: PetEmotions = {
          happiness: Math.max(
            0,
            Math.min(100, emotions.happiness ?? cur.happiness),
          ),
          energy: Math.max(0, Math.min(100, emotions.energy ?? cur.energy)),
          hunger: Math.max(0, Math.min(100, emotions.hunger ?? cur.hunger)),
          social: Math.max(0, Math.min(100, emotions.social ?? cur.social)),
          excitement: Math.max(
            0,
            Math.min(100, emotions.excitement ?? cur.excitement),
          ),
          boredom: Math.max(0, Math.min(100, emotions.boredom ?? cur.boredom)),
        };
        return { pet: { ...s.pet, emotions: next, mood: computeMood(next) } };
      }),

    setMood: (mood) => set((s) => ({ pet: { ...s.pet, mood } })),

    setName: (name) => set((s) => ({ pet: { ...s.pet, name } })),

    setRelationship: (val) =>
      set((s) => ({
        pet: { ...s.pet, relationship: Math.max(0, Math.min(100, val)) },
      })),

    setPersonality: (personality) =>
      set((s) => ({ pet: { ...s.pet, personality } })),

    setScreenSize: (size) => set({ screenSize: size }),

    setLoaded: (loaded) => set({ isLoaded: loaded }),

    setApiConfig: (config) =>
      set((s) => {
        const merged = { ...s.apiConfig, ...config };
        localStorage.setItem("pixel-pet-api-config", JSON.stringify(merged));
        return { apiConfig: merged };
      }),

    setVoiceConfig: (config) =>
      set((s) => {
        const merged = { ...s.voiceConfig, ...config };
        localStorage.setItem("pixel-pet-voice-config", JSON.stringify(merged));
        return { voiceConfig: merged };
      }),

    resetSession: () => set({ sessionId: crypto.randomUUID() }),

    touchInteraction: () =>
      set((s) => {
        const cur = s.pet.emotions;
        const next: PetEmotions = {
          ...cur,
          happiness: Math.min(100, cur.happiness + 5),
          excitement: Math.min(100, cur.excitement + 10),
          boredom: Math.max(0, cur.boredom - 15),
          social: Math.min(100, cur.social + 5),
        };
        return {
          pet: {
            ...s.pet,
            lastInteraction: Date.now(),
            emotions: next,
            mood: computeMood(next),
          },
        };
      }),

    resetPet: () => set({ pet: createDefaultPet() }),
  })),
);

// ─── Cross-window sync ───────────────────────────────────────────────────────
// Each BrowserWindow (pet / chat / settings) has its own independent JS
// context and therefore its own store instance, all reading the same
// localStorage. Without this, a window only sees the config it had at boot —
// e.g. saving an API key in Settings never reaches the already-open pet
// window, so actions run from the pet window (like "Explain") fail while
// actions run from a freshly-opened window (like "Ask Kibo") succeed, because
// that window mounts fresh and reads the current localStorage value.
//
// The native `storage` event fires in *other* same-origin windows whenever
// one of them writes to localStorage (it never fires in the window that made
// the write itself), so we use it to keep every window's store in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "pixel-pet-api-config" && e.newValue) {
      try {
        usePetStore.setState({ apiConfig: JSON.parse(e.newValue) });
      } catch {}
    }
    if (e.key === "pixel-pet-voice-config" && e.newValue) {
      try {
        usePetStore.setState({ voiceConfig: JSON.parse(e.newValue) });
      } catch {}
    }
    if (e.key === "pixel-pet-theme" && e.newValue) {
      if (e.newValue === "light" || e.newValue === "dark") {
        usePetStore.setState({ theme: e.newValue });
      }
    }
  });
}