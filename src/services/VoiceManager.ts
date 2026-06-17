import type { VoiceConfig } from '../models/types';

interface SpeechTask {
  text: string;
  config: VoiceConfig;
  openAiApiKey?: string;
}

export const VoiceManager = {
  privateCurrentAudio: null as HTMLAudioElement | null,
  queue: [] as SpeechTask[],
  isSpeaking: false,
  volume: 1.0, // 0.0 to 1.0

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
    // Stop native web speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Stop OpenAI Audio playback
    if (this.privateCurrentAudio) {
      this.privateCurrentAudio.pause();
      this.privateCurrentAudio = null;
    }
  },

  async speak(text: string, config: VoiceConfig, openAiApiKey?: string, interrupt = false): Promise<void> {
    if (!config.enabled) return;

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
      if (task.config.ttsProvider === 'openai' && task.openAiApiKey) {
        await this.speakOpenAI(task.text, task.config.voiceId || 'alloy', task.config.speed, task.openAiApiKey);
      } else {
        await this.speakWebSpeech(task.text, task.config);
      }
    } catch (err) {
      console.error('[VoiceManager] Speech failed:', err);
    }

    // Process next item
    this.processQueue();
  },

  speakWebSpeech(text: string, config: VoiceConfig): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = config.speed || 1.0;
      utterance.volume = this.volume;

      if (config.voiceId) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === config.voiceId || v.lang === config.voiceId);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  },

  async speakOpenAI(text: string, voice: string, speed: number, apiKey: string): Promise<void> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy',
        speed: speed || 1.0
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI TTS Error: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = this.volume;
    this.privateCurrentAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.play();
    });
  },

  // Added Whisper Speech-to-Text Support
  async transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Whisper Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.text;
  }
};

export default VoiceManager;
