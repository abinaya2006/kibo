import { BrowserWindow, screen, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let petWindow = null;
let chatWindow = null;

const DEV_SERVER_URL = "http://localhost:5173";
const RETRY_DELAY_MS = 1000;

function loadWithRetry(win, url, label) {
  win.loadURL(url);
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    // -3 is ERR_ABORTED, which fires on normal navigations (e.g. hash changes) — ignore it
    if (errorCode === -3) return;
    console.log(
      `[${label}] Failed to load (${errorCode} ${errorDescription}) — retrying in ${RETRY_DELAY_MS}ms`,
    );
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.loadURL(url);
      }
    }, RETRY_DELAY_MS);
  });
}

export function createPetWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  petWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  petWindow.setAlwaysOnTop(true, "screen-saver");
  petWindow.setIgnoreMouseEvents(true, { forward: true });

  const isDev =
    process.env.NODE_ENV === "development" ||
    !process.env.PORTABLE_EXECUTABLE_DIR;
  if (isDev) {
    loadWithRetry(petWindow, DEV_SERVER_URL, "PET WINDOW");
  } else {
    petWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  petWindow.on("closed", () => {
    petWindow = null;
  });

  return petWindow;
}

export function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return chatWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  const width = 600;
  const height = 450;

  chatWindow = new BrowserWindow({
    width,
    height,
    x: screenWidth - width - 20,
    y: screenHeight - height - 20,
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  chatWindow.setAlwaysOnTop(true, "screen-saver");
  chatWindow.setIgnoreMouseEvents(false);

  const isDev =
    process.env.NODE_ENV === "development" ||
    !process.env.PORTABLE_EXECUTABLE_DIR;
  if (isDev) {
    // Append routing hash or search param to distinguish windows in React
    loadWithRetry(chatWindow, `${DEV_SERVER_URL}?window=chat`, "CHAT WINDOW");
  } else {
    chatWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { window: "chat" },
    });
  }

  chatWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  chatWindow.on("closed", () => {
    chatWindow = null;
  });

  return chatWindow;
}

let settingsWindow = null;

export function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  const width = 600;
  const height = 450;

  settingsWindow = new BrowserWindow({
    width,
    height,
    minWidth: 540,
    minHeight: 500,
    useContentSize: true,   // width/height apply to the content area, not OS chrome
    x: Math.round((screenWidth - width) / 2),
    y: Math.round((screenHeight - height) / 2),
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  settingsWindow.setAlwaysOnTop(true, "screen-saver");

  const isDev =
    process.env.NODE_ENV === "development" ||
    !process.env.PORTABLE_EXECUTABLE_DIR;
  if (isDev) {
    loadWithRetry(
      settingsWindow,
      `${DEV_SERVER_URL}?window=settings`,
      "SETTINGS WINDOW",
    );
  } else {
    settingsWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { window: "settings" },
    });
  }

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export function getSettingsWindow() {
  return settingsWindow;
}

export function getPetWindow() {
  return petWindow;
}

export function getChatWindow() {
  return chatWindow;
}

export function sendContextToChat(win, text) {
  console.log(
    "[WINDOW] sendContextToChat called, text:",
    text,
    "isLoading:",
    win.webContents.isLoading(),
  );
  if (!text) return;
  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", () => {
      console.log("[WINDOW] did-finish-load fired, sending after 200ms");
      setTimeout(() => {
        console.log("[WINDOW] sending chat:receive-context now");
        win.webContents.send("chat:receive-context", text);
      }, 200);
    });
  } else {
    setTimeout(() => {
      console.log("[WINDOW] already loaded, sending chat:receive-context now");
      win.webContents.send("chat:receive-context", text);
    }, 200);
  }
}
