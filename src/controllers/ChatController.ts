import { usePetStore } from "../state/usePetStore";
import { AIService } from "../services/AIService";
import { VoiceManager } from "../services/VoiceManager";
import { DatabaseService } from "../services/DatabaseService";
import { audioRecorderSingleton } from "../services/AudioRecorder";
import type { DatabaseMessage } from "../models/types";

export class ChatController {
  private isRecording = false;

  async handleSendPrompt(promptText: string): Promise<void> {
    const store = usePetStore.getState();
    const {
      pet,
      apiConfig,
      voiceConfig,
      sessionId,
      pendingSelectionContext,
      setPendingSelectionContext,
    } = store;

    if (!promptText.trim()) return;

    store.setPetStateDirect("thinking");

    const userMsg: DatabaseMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content: promptText.trim(),
      timestamp: Date.now(),
    };
    await DatabaseService.addMessage(userMsg);

    try {
      const rawHistory = await DatabaseService.getHistory(sessionId);
      const history = rawHistory
        .slice(-6)
        .map((h) => ({ role: h.role, content: h.content }));

      // If there's pending highlighted text, prepend it as real context to the prompt
      let effectivePrompt = promptText;
      if (pendingSelectionContext) {
        effectivePrompt = `Regarding this highlighted text: "${pendingSelectionContext}"\n\nUser's question: ${promptText}`;
        setPendingSelectionContext(null); // clear after first use
      }

      const reply = await AIService.query(
        effectivePrompt,
        history,
        apiConfig,
        pet,
      );

      const assistantMsg: DatabaseMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };
      await DatabaseService.addMessage(assistantMsg);

      store.setPetStateDirect("speaking");
      this.giveExperienceBoost(15);

      await VoiceManager.speak(reply, voiceConfig, apiConfig.apiKey);

      store.setPetStateDirect("idle");
    } catch (err) {
      console.error("[ChatController] Query pipeline failed:", err);
      store.setPetStateDirect("idle");
      throw err;
    }
  }

  async startVoiceRecording(): Promise<void> {
    if (this.isRecording) return;
    const store = usePetStore.getState();

    try {
      this.isRecording = true;
      store.setPetStateDirect("listening");
      await audioRecorderSingleton.start();
    } catch (err) {
      this.isRecording = false;
      store.setPetStateDirect("idle");
      throw err;
    }
  }

  async stopVoiceRecording(): Promise<string> {
    if (!this.isRecording) return "";
    this.isRecording = false;

    const store = usePetStore.getState();
    const { apiConfig } = store;

    try {
      const audioBlob = await audioRecorderSingleton.stop();
      store.setPetStateDirect("thinking");

      // Upload recording to Whisper API
      const transcribedText = await audioRecorderSingleton.transcribe(
        audioBlob,
        apiConfig.apiKey,
      );
      return transcribedText;
    } catch (err) {
      store.setPetStateDirect("idle");
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
      store.setPetStateDirect("happy");
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
