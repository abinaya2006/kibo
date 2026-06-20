import type { VoiceConfig } from "../models/types";

interface SpeechTask {
  text: string;
  config: VoiceConfig;
  openAiApiKey?: string;
}

export const VoiceManager = {
  privateCurrentAudio: null as HTMLAudioElement | null,
  queue: [] as SpeechTask[],
  isSpeaking: false,
  volume: 1.0,

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.privateCurrentAudio) {
      this.privateCurrentAudio.volume = this.volume;
    }
  },

  interrupt() {
    this.queue = [];
    this.stop();
  },

  stop() {
    this.isSpeaking = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.privateCurrentAudio) {
      this.privateCurrentAudio.pause();
      this.privateCurrentAudio = null;
    }
  },

  async speak(
    text: string,
    config: VoiceConfig,
    openAiApiKey?: string,
    interrupt = false,
  ): Promise<void> {
    console.log("[VoiceManager] speak() called:", {
      text,
      enabled: config.enabled,
      provider: config.ttsProvider,
      hasKey: !!openAiApiKey,
    });

    if (!config.enabled) {
      console.warn("[VoiceManager] Aborting — config.enabled is false");
      return;
    }

    if (interrupt) {
      this.interrupt();
    }

    this.queue.push({ text, config, openAiApiKey });
    if (!this.isSpeaking) {
      this.processQueue();
    }
  },

  async processQueue() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const task = this.queue.shift()!;

    try {
      if (task.config.ttsProvider === "openai") {
        if (!task.openAiApiKey) {
          console.error(
            '[VoiceManager] ttsProvider is "openai" but no API key was passed — falling back to Web Speech',
          );
          await this.speakWebSpeech(task.text, task.config);
        } else {
          console.log("[VoiceManager] Using OpenAI TTS");
          await this.speakOpenAI(
            task.text,
            task.config.voiceId || "alloy",
            task.config.speed,
            task.openAiApiKey,
          );
        }
      } else {
        console.log(
          "[VoiceManager] Using Web Speech (ttsProvider was:",
          task.config.ttsProvider,
          ")",
        );
        await this.speakWebSpeech(task.text, task.config);
      }
    } catch (err) {
      console.error("[VoiceManager] Speech failed:", err);
    }

    this.processQueue();
  },

  speakWebSpeech(text: string, config: VoiceConfig): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.error(
          "[VoiceManager] speechSynthesis not available in this environment",
        );
        resolve();
        return;
      }

      const fire = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = config.speed || 1.0;
        utterance.volume = this.volume;

        const voices = window.speechSynthesis.getVoices();
        console.log("[VoiceManager] Available voices:", voices.length);

        if (config.voiceId) {
          const selectedVoice = voices.find(
            (v) => v.name === config.voiceId || v.lang === config.voiceId,
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          } else {
            console.warn(
              "[VoiceManager] voiceId not matched, using default:",
              config.voiceId,
            );
          }
        }

        utterance.onstart = () =>
          console.log("[VoiceManager] Web Speech started");
        utterance.onend = () => {
          console.log("[VoiceManager] Web Speech ended");
          resolve();
        };
        utterance.onerror = (e) => {
          console.error("[VoiceManager] Web Speech error:", e);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Voices often load async on first call — wait for them if the list is empty
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          fire();
        };
      } else {
        fire();
      }
    });
  },

  async speakOpenAI(
    text: string,
    voice: string,
    speed: number,
    apiKey: string,
  ): Promise<void> {
    console.log("[VoiceManager] Requesting OpenAI TTS audio...");

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice || "alloy",
        speed: speed || 1.0,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `OpenAI TTS Error: ${res.status} ${res.statusText} — ${body}`,
      );
    }

    const blob = await res.blob();
    console.log(
      "[VoiceManager] Got audio blob:",
      blob.size,
      "bytes, type:",
      blob.type,
    );

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = this.volume;
    this.privateCurrentAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        console.log("[VoiceManager] OpenAI audio finished");
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (e) => {
        console.error("[VoiceManager] Audio element error:", e);
        URL.revokeObjectURL(url);
        resolve();
      };

      // THIS WAS THE BIG BUG: audio.play() returns a promise that can reject
      // silently (autoplay policy, no user gesture, etc). It was never caught.
      audio.play().catch((err) => {
        console.error("[VoiceManager] audio.play() was rejected:", err);
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  },

  async transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Whisper Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.text;
  },
};

export default VoiceManager;
