<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Outfit&size=38&duration=3000&pause=1000&color=A78BFA&center=true&vCenter=true&width=600&lines=Pet+AI;a+desktop+companion" alt="Desktop Pet" />

<br/>

[![Made with Electron](https://img.shields.io/badge/Made%20with-Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br/>

> A desktop pet that lives on your desktop, reacts to you, and explains anything you highlight — powered by free AI.

<br/>

```
 ／l、
（ﾟ､ ｡７
  l、 ~ヽ
      じしf_,)ノ
this little guy lives on your screen
     and actually helps you learn things
```

</div>

---

## What is this?

Desktop Pet is a desktop companion built with Electron and React. It sits on your screen, wanders around, reacts to your cursor, and can explain anything you highlight using AI.

It combines a virtual pet simulation with a voice assistant and learning tool — without getting in your way while you work.

Think Desktop Goose meets ChatGPT meets Tamagotchi.

---

## Core Features

### Desktop Pet
- Animated SVG pet — cat, dog, or bunny
- 16 states: idle, walking, sleeping, thinking, speaking, listening, chasing cursor, being dragged, and more
- Cursor tracking — pet follows, gets curious, chases fast movement
- Drag anywhere on screen
- Mood system tied to hunger, energy, happiness, and boredom
- Periodic dialogue based on current state and mood

### Text Selection
Highlight anything on screen, press `Alt+Shift+A`, and a popup appears near the pet:

```
Highlight text anywhere
        ↓
  Alt + Shift + A
        ↓
  [ Read ]   [ Explain ]

Read    → pet reads it aloud via TTS
Explain → pet explains it via AI, speaks the response
```

Works in browsers, PDFs, IDEs, notes, anywhere.

### AI Chat
- Floating chat window with full conversation history
- Stored in SQLite, persists across restarts
- Pet animates while thinking and speaking
- Voice input via microphone (Whisper STT)
- Personality-aware responses

### AI Providers
Both are free, no credit card required.

| Provider | Speed | Model | Get Key |
|----------|-------|-------|---------|
| Google Gemini | Fast | gemini-2.0-flash | [aistudio.google.com](https://aistudio.google.com) |
| Groq | Fastest | llama-3.3-70b | [console.groq.com](https://console.groq.com) |

### Voice
- Web Speech API out of the box — zero config
- OpenAI TTS for higher quality
- Voice queue with interrupt support

---

## Getting Started

### Requirements
- Node.js 18+
- npm

### Install and run

```bash
git clone https://github.com/abinaya2006/desktop-pet
cd desktop-pet
npm install
npm run electron-dev
```
