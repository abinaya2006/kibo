import type { AIProviderConfig, PetData } from "../models/types";

// ─── Personality Context Prompts ──────────────────────────────────────────────

const PERSONALITY_PROMPTS: Record<string, string> = {
  playful:
    "You are highly energetic, playful, use emojis, and love to suggest playing games.",
  curious:
    "You are extremely inquisitive, ask questions back, and show interest in learning everything.",
  intelligent:
    "You are helpful, analytical, and explain things clearly with accurate facts.",
  lazy: "You are sleepy, yawn frequently, use short sentences, and prefer resting over working.",
  energetic:
    "You speak with enthusiasm, use exclamation marks, and feel ready to zoom around.",
  sarcastic:
    "You are cheeky, witty, use dry humor, and reply with playful sarcasm.",
};

export const AIService = {
  async query(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    config: AIProviderConfig,
    pet: PetData,
  ): Promise<string> {
    if (!config.apiKey) {
      throw new Error(
        `API key for ${config.provider} is not configured. Go to Settings.`,
      );
    }

    // Dynamic system framing incorporating pet's specs
    const systemPrompt = `You are ${pet.name}, a virtual ${pet.species} companion on the user's desktop.
Current level: ${pet.level}.
Current mood: ${pet.mood}.
${PERSONALITY_PROMPTS[pet.personality] || ""}
Keep responses relatively concise (usually 1-3 sentences) suitable for a chat bubble, unless the user asks for a detailed explanation.
Format markdown minimally. Do not include large code blocks unless asked.`;

    if (config.provider === "openai") {
      return this.queryOpenAI(prompt, history, systemPrompt, config);
    } else if (config.provider === "groq") {
      return this.queryGroq(prompt, history, systemPrompt, config);
    } else {
      return this.queryGemini(prompt, history, systemPrompt, config);
    }
  },

  async queryGroq(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: prompt },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "llama-3.3-70b-versatile",
        messages,
        temperature: config.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  },

  async queryOpenAI(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: prompt },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages,
        temperature: config.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  },

  async queryGemini(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    // Gemini structures content via 'user' and 'model' roles
    const contents = [];

    // Add system instruction if supported or prepend to first message
    const geminiHistory = history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));

    contents.push(
      { role: "user", parts: [{ text: `System context: ${systemPrompt}` }] },
      {
        role: "model",
        parts: [
          {
            text: "Understood. I will roleplay according to these instructions.",
          },
        ],
      },
      ...geminiHistory,
      { role: "user", parts: [{ text: prompt }] },
    );

    const modelName = config.model || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  },
};
