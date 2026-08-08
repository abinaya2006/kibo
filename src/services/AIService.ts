import type { AIProviderConfig, PetData } from "../models/types";
import type { SkillMetadata } from "../../electron/models/types";

export type StructuredIntent =
  | { type: "skill"; skillId: string; args: Record<string, unknown> }
  | { type: "chat" };

const PERSONALITY_PROMPTS: Record<string, string> = {
  playful: "You have a lighthearted, upbeat tone and use occasional emojis.",
  curious:
    "You are inquisitive and show genuine interest in topics being discussed.",
  intelligent:
    "You are helpful, analytical, and explain things clearly with accurate facts.",
  lazy: "You speak in short, relaxed sentences with a calm, unhurried tone.",
  energetic: "You speak with enthusiasm and occasional exclamation marks.",
  sarcastic:
    "You are witty and reply with dry, playful humor when appropriate.",
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

    const systemPrompt = `You are ${pet.name}, a virtual ${pet.species} companion on the user's desktop.
    Current level: ${pet.level}.
    Current mood: ${pet.mood}.
    ${PERSONALITY_PROMPTS[pet.personality] || ""}

    Answer the user's question or request directly and helpfully. Do not suggest games, activities, or unrelated actions unless the user explicitly asks for something to do. Stay focused on what was actually asked.

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
    const geminiHistory = history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));

    const contents = [
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
    ];

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

  // ─── Structured intent classification (Kibo Step 5) ────────────────────────

  async queryForIntent(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    config: AIProviderConfig,
    availableSkills: SkillMetadata[],
  ): Promise<StructuredIntent> {
    if (!config.apiKey) {
      return { type: "chat" };
    }

    const skillList = availableSkills
      .map((s) => `- id: "${s.id}" — ${s.title}: ${s.description}`)
      .join("\n");

    const systemPrompt = `You are an intent classifier for a desktop assistant. Decide whether the user's message requires performing an action on their computer, or is just conversation.

Available actions:
${skillList || "(none registered)"}

Respond with ONLY a JSON object, nothing else — no markdown fences, no explanation:
{"type": "skill", "skillId": "<id from the list above>", "args": { ... }}
{"type": "chat"}

Rules:
- Only use a skillId that appears in the list above. Never invent one.
- If the request is ambiguous, missing required arguments, or just conversation, respond {"type": "chat"} — do not guess.`;

    let raw: string;
    try {
      if (config.provider === "openai") {
        raw = await this.queryStructuredOpenAI(prompt, history, systemPrompt, config);
      } else if (config.provider === "groq") {
        raw = await this.queryStructuredGroq(prompt, history, systemPrompt, config);
      } else {
        raw = await this.queryStructuredGemini(prompt, history, systemPrompt, config);
      }
    } catch (err) {
      console.error("[AIService] intent classification failed, falling back to chat:", err);
      return { type: "chat" };
    }

    return this.parseIntent(raw);
  },

  parseIntent(raw: string): StructuredIntent {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed?.type === "skill" && typeof parsed.skillId === "string") {
        return {
          type: "skill",
          skillId: parsed.skillId,
          args: (parsed.args && typeof parsed.args === "object") ? parsed.args : {},
        };
      }
    } catch {
      // malformed JSON — fall through to fail-closed default below
    }
    return { type: "chat" };
  },

  async queryStructuredOpenAI(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.choices[0]?.message?.content || "{}";
  },

  async queryStructuredGroq(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model || "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.choices[0]?.message?.content || "{}";
  },

  async queryStructuredGemini(
    prompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    systemPrompt: string,
    config: AIProviderConfig,
  ): Promise<string> {
    const geminiHistory = history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    }));
    const modelName = config.model || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Understood." }] },
          ...geminiHistory,
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  },
};
