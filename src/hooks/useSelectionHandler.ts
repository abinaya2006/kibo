import { useEffect, useCallback } from "react";
import { usePetStore } from "../state/usePetStore";
import { AIService } from "../services/AIService";
import { VoiceManager } from "../services/VoiceManager";

function speakText(text: string, onDone?: () => void) {
  if (!window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.1;
  utterance.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.name.includes("Aria") || v.name.includes("Zira") || v.lang === "en-US",
  );
  if (preferred) utterance.voice = preferred;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}

export function useSelectionHandler(
  setSpeech: (text: string | null) => void,
  showPopup: (text: string, x: number, y: number) => void,
) {
  const store = usePetStore();

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onSelectionCaptured(
      (text: string) => {
        if (!text?.trim()) return;
        const { position } = store.pet.physics;
        const popupX = position.x + 110;
        const popupY = position.y - 20;
        showPopup(text.trim(), popupX, popupY);
      },
    );
    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleRead = useCallback((text: string) => {
    const { voiceConfig } = store;
    store.setPetStateDirect("listening");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });

    setTimeout(() => {
      store.setPetStateDirect("speaking");
      setSpeech(text); // ← full text, no truncation

      if (voiceConfig.enabled) {
        VoiceManager.speak(text, voiceConfig, undefined, true).then(() => {
          store.setPetStateDirect("idle");
        });
      } else {
        speakText(text, () => store.setPetStateDirect("idle"));
      }
    }, 500);
  }, []);

  const handleExplain = useCallback(async (text: string) => {
    const { apiConfig, voiceConfig, pet } = store;

    store.setPetStateDirect("thinking");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
    setSpeech("Hmm, let me think...");

    try {
      const prompt = `Explain this simply and concisely in 2-3 sentences, as if talking to someone learning:\n\n"${text}"`;
      const explanation = await AIService.query(prompt, [], apiConfig, pet);

      store.setPetStateDirect("speaking");
      setSpeech(explanation); // ← full explanation, no truncation

      if (voiceConfig.enabled) {
        await VoiceManager.speak(
          explanation,
          voiceConfig,
          apiConfig.apiKey,
          true,
        );
      } else {
        await new Promise<void>((resolve) => speakText(explanation, resolve));
      }

      store.setPetStateDirect("idle");
    } catch (err) {
      console.error("[useSelectionHandler] Explain failed:", err);
      setSpeech("Oops, I had trouble explaining that!");
      setTimeout(() => {
        setSpeech(null);
        store.setPetStateDirect("idle");
      }, 2500);
    }
  }, []);

  // ← this is what was missing
  return { handleRead, handleExplain };
}
