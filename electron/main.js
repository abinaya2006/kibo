/* eslint-disable @typescript-eslint/no-var-requires */
const { app, ipcMain, screen, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const {
  createPetWindow,
  createChatWindow,
  createSettingsWindow,
  getPetWindow,
  getChatWindow,
  getSettingsWindow,
} = require("./windowManager");
const { registerShortcut, unregisterShortcut } = require("./clipboardWatcher");
const {
  initDatabase,
  saveMessage,
  getMessages,
  clearMessages,
  closeDatabase,
} = require("./database/db");

let store = null;
let tray = null;

async function initStore() {
  try {
    const Store = require("electron-store");
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

  ipcMain.handle("window:create-chat", () => {
    createChatWindow();
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
}

app.whenReady().then(async () => {
  await initStore();
  initDatabase(app);
  registerIpcHandlers();

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
