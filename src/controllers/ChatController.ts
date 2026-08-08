import { usePetStore } from "../state/usePetStore";
import { AIService } from "../services/AIService";
import { VoiceManager } from "../services/VoiceManager";
import { DatabaseService } from "../services/DatabaseService";
import { EventBus } from "../services/EventBus";
import { audioRecorderSingleton } from "../services/AudioRecorder";
import type { DatabaseMessage } from "../models/types";
import type { SkillMetadata, SkillResult } from "../../electron/models/types";

let cachedSkills: SkillMetadata[] | null = null;
async function getAvailableSkills(): Promise<SkillMetadata[]> {
  if (cachedSkills) return cachedSkills;
  if (!window.electronAPI?.listSkills) return [];
  try {
    cachedSkills = await window.electronAPI.listSkills();
  } catch {
    return [];
  }
  return cachedSkills;
}

function parseConfirmationAnswer(text: string): boolean | null {
  const t = text.trim().toLowerCase();
  if (/^(y|yes|yep|yeah|confirm|ok|okay|do it|go ahead|proceed)\b/.test(t)) return true;
  if (/^(n|no|nope|cancel|stop|don't|dont|abort)\b/.test(t)) return false;
  return null;
}

function formatSkillResult(result: SkillResult): string {
  if (result.success) return result.message || "Done.";
  if (result.error === "NOT_CONFIRMED") return "Okay, I won't do that.";
  return `That didn't work: ${result.message || result.error || "unknown error"}`;
}

export class ChatController {
  private isRecording = false;

  async handleSendPrompt(promptText: string): Promise<void> {
    const store = usePetStore.getState();
    const {
      pet, apiConfig, voiceConfig, sessionId,
      pendingSelectionContext, setPendingSelectionContext,
      pendingConfirmation, setPendingConfirmation,
    } = store;

    if (!promptText.trim()) return;

    if (pendingConfirmation) {
      await DatabaseService.addMessage({
        id: crypto.randomUUID(), sessionId, role: "user",
        content: promptText.trim(), timestamp: Date.now(),
      });

      const answer = parseConfirmationAnswer(promptText);
      if (answer === null) {
        await DatabaseService.addMessage({
          id: crypto.randomUUID(), sessionId, role: "assistant",
          content: `Just need a yes or no on "${pendingConfirmation.title}" — want me to go ahead?`,
          timestamp: Date.now(),
        });
        EventBus.emit("chat:updated", null);
        return;
      }

      setPendingConfirmation(null);
      await window.electronAPI?.respondToSkillConfirm(pendingConfirmation.requestId, answer);
      await DatabaseService.addMessage({
        id: crypto.randomUUID(), sessionId, role: "assistant",
        content: answer ? "On it." : "Okay, cancelled.",
        timestamp: Date.now(),
      });
      EventBus.emit("chat:updated", null);
      return;
    }

    store.setPetStateDirect("thinking");
    await DatabaseService.addMessage({
      id: crypto.randomUUID(), sessionId, role: "user",
      content: promptText.trim(), timestamp: Date.now(),
    });

    try {
      const rawHistory = await DatabaseService.getHistory(sessionId);
      const history = rawHistory.slice(-6).map((h) => ({ role: h.role, content: h.content }));

      const availableSkills = await getAvailableSkills();
      const intent = availableSkills.length
        ? await AIService.queryForIntent(promptText, history, apiConfig, availableSkills)
        : ({ type: "chat" as const });

      if (intent.type === "skill") {
        window.electronAPI!.executeSkill(intent.skillId, intent.args)
          .then(async (result) => {
            await DatabaseService.addMessage({
              id: crypto.randomUUID(), sessionId, role: "assistant",
              content: formatSkillResult(result), timestamp: Date.now(),
            });
            usePetStore.getState().setPetStateDirect("idle");
            EventBus.emit("chat:updated", null);
          })
          .catch(async (err) => {
            await DatabaseService.addMessage({
              id: crypto.randomUUID(), sessionId, role: "assistant",
              content: `Something went wrong running that: ${err instanceof Error ? err.message : String(err)}`,
              timestamp: Date.now(),
            });
            usePetStore.getState().setPetStateDirect("idle");
            EventBus.emit("chat:updated", null);
          });

        store.setPetStateDirect("idle");
        return;
      }

      let effectivePrompt = promptText;
      if (pendingSelectionContext) {
        effectivePrompt = `Regarding this highlighted text: "${pendingSelectionContext}"\n\nUser's question: ${promptText}`;
        setPendingSelectionContext(null);
      }

      const reply = await AIService.query(effectivePrompt, history, apiConfig, pet);
      const assistantMsg: DatabaseMessage = {
        id: crypto.randomUUID(), sessionId, role: "assistant",
        content: reply, timestamp: Date.now(),
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
