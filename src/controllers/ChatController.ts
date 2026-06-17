import { usePetStore } from '../state/usePetStore';
import { AIService } from '../services/AIService';
import { VoiceManager } from '../services/VoiceManager';
import { DatabaseService } from '../services/DatabaseService';
import { audioRecorderSingleton } from '../services/AudioRecorder';
import type { DatabaseMessage } from '../models/types';

export class ChatController {
  private isRecording = false;

  async handleSendPrompt(promptText: string): Promise<void> {
    const store = usePetStore.getState();
    const { pet, apiConfig, voiceConfig, sessionId } = store;

    if (!promptText.trim()) return;

    // 1. Enter thinking FSM state
    store.setPetStateDirect('thinking');

    // 2. Persist User query
    const userMsg: DatabaseMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      content: promptText.trim(),
      timestamp: Date.now(),
    };
    await DatabaseService.addMessage(userMsg);

    try {
      // 3. Load conversation context from memory
      const rawHistory = await DatabaseService.getHistory(sessionId);
      // Filter out system configurations or take last 6 messages
      const history = rawHistory
        .slice(-6)
        .map((h) => ({ role: h.role, content: h.content }));

      // 4. Query AI model
      const reply = await AIService.query(promptText, history, apiConfig, pet);

      // 5. Persist assistant reply
      const assistantMsg: DatabaseMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      await DatabaseService.addMessage(assistantMsg);

      // 6. Enter speaking state and play voice synthesis
      store.setPetStateDirect('speaking');

      // level experience boost
      this.giveExperienceBoost(15);

      // Trigger text-to-speech engine
      await VoiceManager.speak(reply, voiceConfig, apiConfig.apiKey);

      // Return companion to idle
      store.setPetStateDirect('idle');
    } catch (err) {
      console.error('[ChatController] Query pipeline failed:', err);
      store.setPetStateDirect('idle');
      throw err;
    }
  }

  async startVoiceRecording(): Promise<void> {
    if (this.isRecording) return;
    const store = usePetStore.getState();

    try {
      this.isRecording = true;
      store.setPetStateDirect('listening');
      await audioRecorderSingleton.start();
    } catch (err) {
      this.isRecording = false;
      store.setPetStateDirect('idle');
      throw err;
    }
  }

  async stopVoiceRecording(): Promise<string> {
    if (!this.isRecording) return '';
    this.isRecording = false;

    const store = usePetStore.getState();
    const { apiConfig } = store;

    try {
      const audioBlob = await audioRecorderSingleton.stop();
      store.setPetStateDirect('thinking');

      // Upload recording to Whisper API
      const transcribedText = await audioRecorderSingleton.transcribe(audioBlob, apiConfig.apiKey);
      return transcribedText;
    } catch (err) {
      store.setPetStateDirect('idle');
      throw err;
    }
  }

  private giveExperienceBoost(amount: number) {
    const store = usePetStore.getState();
    const { pet } = store;

    let nextExp = pet.experience + amount;
    let nextLvl = pet.level;
    const requiredExp = nextLvl * 100;

    if (nextExp >= requiredExp) {
      nextExp -= requiredExp;
      nextLvl += 1;
      // level up!
      store.setPetStateDirect('happy');
      store.setEmotions({ happiness: 100, excitement: 90 });
    }

    store.setPet({
      ...pet,
      level: nextLvl,
      experience: nextExp,
    });
  }
}

export const chatControllerSingleton = new ChatController();
export default chatControllerSingleton;
