import { app, ipcMain, screen, Tray, Menu, nativeImage } from "electron";
import {
  createPetWindow,
  createChatWindow,
  createSettingsWindow,
  getPetWindow,
  getChatWindow,
  getSettingsWindow,
  sendContextToChat,
} from "./windowManager.js";
import { registerShortcut, unregisterShortcut } from "./clipboardWatcher.js";
import {
  initDatabase,
  saveMessage,
  getMessages,
  clearMessages,
  closeDatabase,
} from "./database/db.cjs";
import { bootstrapSkills, skillRegistry } from "./bootstrap.ts";

let store = null;
let tray = null;

async function initStore() {
  try {
    const { default: Store } = await import("electron-store");
    store = new Store({ name: "desktop-pet-data" });
  } catch (err) {
    console.warn("[Store] electron-store unavailable:", err.message);
  }
}

function initTray() {
  try {
    const icon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    );
    tray = new Tray(icon);
    tray.setToolTip("Pixel Pet AI");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show Pet",
        click: () => {
          const win = getPetWindow();
          if (win) win.show();
        },
      },
      { label: "Open Chat Panel", click: () => createChatWindow() },
      { type: "separator" },
      { label: "Exit Application", click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.warn(
      "[Tray] Failed to load Tray icon (development platform fallback):",
      err.message,
    );
  }
}

function registerIpcHandlers() {
  ipcMain.handle("pet:save", (_event, petData) => {
    if (!store) return { success: false };
    try {
      store.set("pet", petData);
      return { success: true };
    } catch (err) {
      console.error("[Store] save failed:", err);
      return { success: false };
    }
  });

  ipcMain.handle("window:create-settings", () => {
    createSettingsWindow();
  });

  ipcMain.handle("window:close-settings", () => {
    const win = getSettingsWindow();
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle("window:set-chat-ignore-mouse", (_event, { ignore }) => {
    const chatWin = getChatWindow();
    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.handle("pet:load", () => {
    if (!store) return null;
    try {
      return store.get("pet", null);
    } catch (err) {
      console.error("[Store] load failed:", err);
      return null;
    }
  });

  ipcMain.handle("pet:delete", () => {
    if (!store) return { success: false };
    try {
      store.delete("pet");
      return { success: true };
    } catch (err) {
      console.error("[Store] delete failed:", err);
      return { success: false };
    }
  });

  ipcMain.handle("window:set-ignore-mouse", (_event, { ignore }) => {
    const petWin = getPetWindow();
    if (petWin && !petWin.isDestroyed()) {
      petWin.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });

  ipcMain.handle("window:get-bounds", () => {
    const petWin = getPetWindow();
    if (!petWin || petWin.isDestroyed()) return null;
    return petWin.getBounds();
  });

  ipcMain.handle("window:get-screen-size", () => {
    const display = screen.getPrimaryDisplay();
    return display.workAreaSize;
  });

  ipcMain.handle("window:close-chat", () => {
    const chatWin = getChatWindow();
    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.close();
    }
  });

  ipcMain.handle("db:get-history", (_event, { sessionId }) => {
    return getMessages(sessionId);
  });

  ipcMain.handle("db:add-message", (_event, { message }) => {
    saveMessage(message);
    return { success: true };
  });

  ipcMain.handle("db:clear-history", (_event, { sessionId }) => {
    clearMessages(sessionId);
    return { success: true };
  });

  ipcMain.handle("app:quit", () => {
    app.quit();
  });

  // ── Chat window + context ──────────────────────────────────────────────────
  ipcMain.handle("window:create-chat", (_event, selectedText) => {
    console.log("[MAIN] window:create-chat called with text:", selectedText);

    const existing = getChatWindow();
    console.log("[MAIN] existing chatWindow:", existing ? "exists" : "null");

    if (existing && !existing.isDestroyed()) {
      existing.show();
      existing.focus();
      sendContextToChat(existing, selectedText);
      return;
    }

    const newWin = createChatWindow();
    console.log("[MAIN] new chatWindow created:", !!newWin);
    sendContextToChat(newWin, selectedText);
  });

  // ── Skills (Kibo Step 2) ─────────────────────────────────────────────────────
  ipcMain.handle("skill:execute", async (_event, skillId, args) => {
    if (!skillRegistry) {
      return { success: false, error: "Skill registry not initialized" };
    }
    try {
      return await skillRegistry.execute(skillId, args);
    } catch (err) {
      // SkillRegistry.execute should already return a structured
      // SkillResult on failure — this only catches what escapes it
      // (e.g. an unrecognized skillId thrown before that point).
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

app.whenReady().then(async () => {
  await initStore();
  initDatabase(app);
  registerIpcHandlers();
  bootstrapSkills();

  createPetWindow();
  initTray();
  registerShortcut();

  app.on("activate", () => {
    if (!getPetWindow()) createPetWindow();
  });
});

app.on("will-quit", () => {
  unregisterShortcut();
  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
