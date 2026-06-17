import type { DatabaseMessage } from '../models/types';

export const DatabaseService = {
  async getHistory(sessionId: string): Promise<DatabaseMessage[]> {
    if (window.electronAPI) {
      return window.electronAPI.getHistory(sessionId);
    }

    // fallback memory storage in browser mode
    try {
      const stored = localStorage.getItem(`pixel-pet-chat-history-${sessionId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async addMessage(message: DatabaseMessage): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.addMessage(message);
      return;
    }

    // fallback persistence
    try {
      const history = await this.getHistory(message.sessionId);
      history.push(message);
      localStorage.setItem(`pixel-pet-chat-history-${message.sessionId}`, JSON.stringify(history));
    } catch (err) {
      console.error('[DatabaseService] browser write fallback failed:', err);
    }
  },

  async clearHistory(sessionId: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.clearHistory(sessionId);
      return;
    }

    try {
      localStorage.removeItem(`pixel-pet-chat-history-${sessionId}`);
    } catch { /* ignore */ }
  }
};
