import type { SkillMetadata, SkillResult, DryRunResult, SkillRisk } from "../../electron/models/types";

// ─── FSM States ──────────────────────────────────────────────────────────────

export interface SkillConfirmRequest {
  requestId: string;
  skillId: string;
  title: string;
  risk: SkillRisk;
  args: unknown;
  preview: DryRunResult | null;
}

export type PetState =
  | "idle"
  | "walking"
  | "running"
  | "sleeping"
  | "playing"
  | "followingCursor"
  | "chasingCursor"
  | "beingDragged"
  | "happy"
  | "curious"
  | "eating"
  | "thinking"
  | "yawning"
  | "stretches"
  | "listening"
  | "speaking"
  | "beingPatted";   // ← head-pat animation during play

// ─── Mood & Personality ───────────────────────────────────────────────────────

export type PetMood =
  | "happy"
  | "excited"
  | "neutral"
  | "sleepy"
  | "bored"
  | "curious"
  | "sad"
  | "hungry";

export type PetPersonality =
  | "playful"
  | "curious"
  | "intelligent"
  | "lazy"
  | "energetic"
  | "sarcastic";

// ─── Emotions ─────────────────────────────────────────────────────────────────

export interface PetEmotions {
  happiness: number; // 0-100
  energy: number; // 0-100
  hunger: number; // 0-100
  social: number; // 0-100
  excitement: number; // 0-100
  boredom: number; // 0-100
}

// ─── Physics ──────────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface PetPhysics {
  position: Vec2;
  velocity: Vec2;
  targetPosition: Vec2 | null;
  speed: number;
  facing: "left" | "right";
}

// ─── Canonical Pet Database Model ─────────────────────────────────────────────

export interface PetData {
  id: string;
  name: string;
  species: string;
  level: number;
  experience: number;
  relationship: number; // 0-100
  personality: PetPersonality;
  state: PetState;
  mood: PetMood;
  emotions: PetEmotions;
  physics: PetPhysics;
  lastInteraction: number; // ms
  createdAt: number; // ms
}

// ─── Cursor Metrics ───────────────────────────────────────────────────────────

export interface CursorData {
  position: Vec2;
  velocity: Vec2;
  speed: number;
  distanceToPet: number;
  angleToPet: number;
  isNearby: boolean;
  isCircling: boolean;
  dwellTime: number;
  lastSeen: number;
}

// ─── Rare Wander Events ────────────────────────────────────────────────────
// Occasional wandering visitors (butterfly, firefly, etc.) that Kibo chases
// every few hours. See controllers/RareEventController.ts

export type RareEventKind =
  | "butterfly"
  | "paperAirplane"
  | "ladybug"
  | "firefly"
  | "leaf"
  | "star";

export interface RareEventData {
  id: string;
  kind: RareEventKind;
  position: Vec2;
  spawnedAt: number; // ms
}

// ─── Database Memory ──────────────────────────────────────────────────────────

export interface DatabaseMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ─── Configuration Store ──────────────────────────────────────────────────────

export interface StoredPetData {
  id: string;
  name: string;
  species: string;
  level: number;
  experience: number;
  relationship: number; // 0-100
  personality: PetPersonality;
  happiness: number;
  energy: number;
  hunger: number; // 0-100
  social: number; // 0-100
  mood: PetMood;
  position: Vec2;
  lastInteraction: number;
  createdAt: number;
}

// ─── API Integrations ─────────────────────────────────────────────────────────

export interface AIProviderConfig {
  provider: "openai" | "gemini" | "groq";
  apiKey: string;
  model: string;
  temperature: number;
}

export interface VoiceConfig {
  ttsProvider: "edge" | "openai";
  openaiApiKey?: string;
  voiceId: string;
  speed: number;
  enabled: boolean;
}

// ─── Electron Context Bridge Interface ────────────────────────────────────────

export interface ElectronAPI {
  savePet: (data: StoredPetData) => Promise<{ success: boolean }>;
  loadPet: () => Promise<StoredPetData | null>;
  deletePet: () => Promise<{ success: boolean }>;
  setIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
  getBounds: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  createSettingsWindow: () => Promise<void>;
  setChatIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
  closeSettingsWindow: () => Promise<void>;
  getScreenSize: () => Promise<{ width: number; height: number }>;
  createChatWindow: () => Promise<void>;
  closeChatWindow: () => Promise<void>;

  getHistory: (sessionId: string) => Promise<DatabaseMessage[]>;
  addMessage: (message: DatabaseMessage) => Promise<{ success: boolean }>;
  clearHistory: (sessionId: string) => Promise<{ success: boolean }>;

  quit: () => Promise<void>;
  onSelectionCaptured: (callback: (text: string) => void) => () => void;

  send: (channel: string, data: unknown) => void;
  receive: (
    channel: string,
    callback: (...args: unknown[]) => void,
  ) => () => void;
  removeAllListeners: (channel: string) => void;
  executeSkill: (skillId: string, args: unknown) => Promise<SkillResult>; // was missing from the type despite existing in preload.cjs since Step 2
  listSkills: () => Promise<SkillMetadata[]>;
  dryRunSkill: (skillId: string, args: unknown) => Promise<DryRunResult>;
  onSkillConfirmRequest: (callback: (payload: SkillConfirmRequest) => void) => () => void;
  respondToSkillConfirm: (requestId: string, approved: boolean) => Promise<boolean>;
  onChatContext: (callback: (text: string) => void) => () => void; // also already used in ChatWindow.tsx and defined in preloa
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
