import type { PetData, StoredPetData } from '../models/types';

// ─── Storage Service ───────────────────────────────────────────────────────────
// Wraps IPC calls to electron-store.
// Falls back to localStorage when running outside Electron (browser dev mode).

export const StorageService = {
  async savePet(pet: PetData): Promise<void> {
    const payload: StoredPetData = {
      id:              pet.id,
      name:            pet.name,
      species:         pet.species,
      level:           pet.level,
      experience:      pet.experience,
      personality:     pet.personality,
      relationship:    pet.relationship,
      happiness:       pet.emotions.happiness,
      energy:          pet.emotions.energy,
      hunger:          pet.emotions.hunger,
      social:          pet.emotions.social,
      mood:            pet.mood,
      position:        pet.physics.position,
      lastInteraction: pet.lastInteraction,
      createdAt:       pet.createdAt,
    };
    if (window.electronAPI) {
      await window.electronAPI.savePet(payload);
    } else {
      try { localStorage.setItem('desktop-pet', JSON.stringify(payload)); } catch { /* ignore */ }
    }
  },

  async loadPet(): Promise<StoredPetData | null> {
    if (window.electronAPI) {
      return window.electronAPI.loadPet();
    }
    try {
      const raw = localStorage.getItem('desktop-pet');
      return raw ? (JSON.parse(raw) as StoredPetData) : null;
    } catch {
      return null;
    }
  },

  async deletePet(): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.deletePet();
    } else {
      localStorage.removeItem('desktop-pet');
    }
  },
};
