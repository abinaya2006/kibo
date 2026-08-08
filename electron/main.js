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

  // ── TEMP: Step 3 verification — delete this block once confirmed ──
  // skillRegistry
  //   .execute("filesystem.createFile", {
  //     path: "kibo-test.txt",
  //     content: "hello from step 3",
  //   })
  //   .then((result) => console.log("[TEST] createFile:", result))
  //   .catch((err) => console.error("[TEST] createFile failed:", err));

  //traversal
  // skillRegistry
  //   .execute("filesystem.readFile", { path: "../../../../Windows/System32/drivers/etc/hosts" })
  //   .then((result) => console.log("[TEST] traversal:", result))
  //   .catch((err) => console.error("[TEST] traversal threw:", err));


  //rename
  // skillRegistry
  //   .execute("filesystem.renameFile", { path: "kibo-test.txt", newName: "kibo-renamed.txt" })
  //   .then((result) => console.log("[TEST] rename:", result))
  //   .catch((err) => console.error("[TEST] rename failed:", err));

  //move
  // skillRegistry
  //   .execute("filesystem.moveFile", { source: "kibo-renamed.txt", destination: "Downloads/kibo-moved.txt", overwrite: false })
  //   .then((result) => console.log("[TEST] move:", result))
  //   .catch((err) => console.error("[TEST] move failed:", err));
  //

  //delete
  // skillRegistry
  //   .execute("filesystem.deleteFile", { path: "Downloads/kibo-moved.txt" })
  //   .then((result) => console.log("[TEST] delete:", result))
  //   .catch((err) => console.error("[TEST] delete failed:", err));
  //

  //search
  // skillRegistry
  //   .execute("filesystem.searchFiles", { root: ".", query: "kibo" })
  //   .then((result) => console.log("[TEST] search:", result))
  //   .catch((err) => console.error("[TEST] search failed:", err));

  //-------------------------------------------------------------------------
  //clipboard
  // skillRegistry
  //   .execute("clipboard.copyText", { text: "hello from kibo step 4" })
  //   .then((result) => console.log("[TEST] copyText:", result))
  //   .catch((err) => console.error("[TEST] copyText failed:", err));

  //system info
  // skillRegistry
  //   .execute("system.info", { metric: "battery" })
  //   .then((result) => console.log("[TEST] systemInfo battery:", result))
  //   .catch((err) => console.error("[TEST] systemInfo failed:", err));
  //

  //notification
  // skillRegistry
  //   .execute("utilities.notify", { title: "Kibo", body: "Step 4 test notification" })
  //   .then((result) => console.log("[TEST] notify:", result))
  //   .catch((err) => console.error("[TEST] notify failed:", err));
  //

  //screenshot
  // skillRegistry
  //   .execute("utilities.screenshot", { savePath: "kibo-screenshot.png" })
  //   .then((result) => console.log("[TEST] screenshot:", result))
  //   .catch((err) => console.error("[TEST] screenshot failed:", err));

  //open url
  // skillRegistry
  //   .execute("utilities.openUrl", { url: "https://anthropic.com" })
  //   .then((result) => console.log("[TEST] openUrl:", result))
  //   .catch((err) => console.error("[TEST] openUrl failed:", err));

  //list installed apps
  // skillRegistry
  //   .execute("apps.listInstalled", {})
  //   .then((result) => console.log("[TEST] listInstalled:", result.data?.slice(0, 5), "total:", result.data?.length))
  //   .catch((err) => console.error("[TEST] listInstalled failed:", err));
  //

  //timer
  // skillRegistry
  //   .execute("utilities.timer", { seconds: 3, label: "quick test" })
  //   .then((result) => console.log("[TEST] timer:", result))
  //   .catch((err) => console.error("[TEST] timer failed:", err));
  //

  //open app
  // skillRegistry
  //   .execute("apps.open", { appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Accessories\\Notepad.lnk" })
  //   .then((result) => console.log("[TEST] openApp:", result))
  //   .catch((err) => console.error("[TEST] openApp failed:", err));

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
