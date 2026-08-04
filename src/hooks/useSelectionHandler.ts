import { useEffect, useCallback } from "react";
import { usePetStore } from "../state/usePetStore";
import { AIService } from "../services/AIService";
import { DatabaseService } from "../services/DatabaseService";

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
    store.setPetStateDirect("listening");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });

    setTimeout(() => {
      store.setPetStateDirect("speaking");
      setSpeech(text);
      // No auto-speak — bubble is silent, dismisses itself via its own timer
    }, 500);
  }, []);

  const handleExplain = useCallback(async (text: string) => {
    const { apiConfig, pet } = store;

    store.setPetStateDirect("thinking");
    store.setTargetPosition(null);
    store.setVelocity({ x: 0, y: 0 });
    setSpeech("Hmm, let me think...");

    try {
      const prompt = `Explain this simply and concisely in 2-3 sentences, as if talking to someone learning:\n\n"${text}"`;
      const explanation = await AIService.query(prompt, [], apiConfig, pet);

      store.setPetStateDirect("speaking");
      setSpeech(explanation);
      // No auto-speak — SpeechBubble's own pagination/dismiss timer handles the rest
    } catch (err) {
      console.error("[useSelectionHandler] Explain failed:", err);
      setSpeech("Oops, I had trouble explaining that!");
      setTimeout(() => {
        setSpeech(null);
        store.setPetStateDirect("idle");
      }, 2500);
    }
  }, []);

  const handleAskKibo = useCallback(async (text: string) => {
    console.log("[SELECTION] handleAskKibo called with:", text);
    window.electronAPI?.createChatWindow(text);
  }, []);

  return { handleRead, handleExplain, handleAskKibo };
}

export default useSelectionHandler;
