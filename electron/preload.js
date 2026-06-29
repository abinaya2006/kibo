const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Pet Persistence ─────────────────────────────────────────────────────────
  savePet: (data) => ipcRenderer.invoke("pet:save", data),
  loadPet: () => ipcRenderer.invoke("pet:load"),
  deletePet: () => ipcRenderer.invoke("pet:delete"),

  createSettingsWindow: () => ipcRenderer.invoke("window:create-settings"),
  closeSettingsWindow: () => ipcRenderer.invoke("window:close-settings"),
  // ── Window Management ──────────────────────────────────────────────────────
  setIgnoreMouseEvents: (ignore) =>
    ipcRenderer.invoke("window:set-ignore-mouse", { ignore }),
  getBounds: () => ipcRenderer.invoke("window:get-bounds"),
  getScreenSize: () => ipcRenderer.invoke("window:get-screen-size"),
  createChatWindow: (text) => ipcRenderer.invoke("window:create-chat", text),
  closeChatWindow: () => ipcRenderer.invoke("window:close-chat"),
  setChatIgnoreMouseEvents: (ignore) =>
    ipcRenderer.invoke("window:set-chat-ignore-mouse", { ignore }),
  // ── Database Memory ────────────────────────────────────────────────────────
  getHistory: (sessionId) =>
    ipcRenderer.invoke("db:get-history", { sessionId }),
  addMessage: (message) => ipcRenderer.invoke("db:add-message", { message }),
  clearHistory: (sessionId) =>
    ipcRenderer.invoke("db:clear-history", { sessionId }),

  // ── App & Utilities ────────────────────────────────────────────────────────
  quit: () => ipcRenderer.invoke("app:quit"),

  // ── Selection capture listener ──────────────────────────────────────────────
  onSelectionCaptured: (callback) => {
    const sub = (_event, text) => callback(text);
    ipcRenderer.on("selection:captured", sub);
    return () => ipcRenderer.removeListener("selection:captured", sub);
  },

  // ── Generic extensions ──────────────────────────────────────────────────────
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, callback) => {
    const sub = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, sub);
    return () => ipcRenderer.removeListener(channel, sub);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  onChatContext: (callback) => {
    const sub = (_event, text) => callback(text);
    ipcRenderer.on("chat:receive-context", sub);
    return () => ipcRenderer.removeListener("chat:receive-context", sub);
  },
});
