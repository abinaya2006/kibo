import { usePetStore } from '../state/usePetStore';
import { AIService } from '../services/AIService';
import { VoiceManager } from '../services/VoiceManager';
import { EventBus } from '../services/EventBus';

export const AIManager = {
  async askPet(prompt: string) {
    const store = usePetStore.getState();
    const { apiConfig, voiceConfig, pet } = store;
    
    store.setPetStateDirect('thinking');
    
    try {
      // In a real app we'd load history from the DB, but for simple queries we'll use an empty array.
      const response = await AIService.query(prompt, [], apiConfig, pet);
      
      store.setPetStateDirect('speaking');
      
      if (window.electronAPI) {
        window.electronAPI.addMessage({
          id: crypto.randomUUID(),
          sessionId: store.sessionId,
          role: 'user',
          content: prompt,
          timestamp: Date.now()
        });
        window.electronAPI.addMessage({
          id: crypto.randomUUID(),
          sessionId: store.sessionId,
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        });
        EventBus.emit('chat:updated', null);
      }

      // Speak response aloud
      await VoiceManager.speak(response, voiceConfig, apiConfig.apiKey, true);
      
      store.setPetStateDirect('idle');
    } catch (err) {
      console.error('[AIManager] Error querying AI:', err);
      store.setPetStateDirect('idle');
    }
  }
};
