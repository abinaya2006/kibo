const { BrowserWindow, screen, shell } = require("electron");
const path = require("path");

let petWindow = null;
let chatWindow = null;

function createPetWindow() {
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
      preload: path.join(__dirname, "preload.js"),
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
    petWindow.loadURL("http://localhost:5173");
  } else {
    petWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  petWindow.on("closed", () => {
    petWindow = null;
  });

  return petWindow;
}

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return chatWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  const width = 380;
  const height = 600;

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
      preload: path.join(__dirname, "preload.js"),
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
    chatWindow.loadURL("http://localhost:5173?window=chat");
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

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  const width = 480;
  const height = 620;

  settingsWindow = new BrowserWindow({
    width,
    height,
    x: Math.round((screenWidth - width) / 2),
    y: Math.round((screenHeight - height) / 2),
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  settingsWindow.setAlwaysOnTop(true, "screen-saver");

  const isDev =
    process.env.NODE_ENV === "development" ||
    !process.env.PORTABLE_EXECUTABLE_DIR;
  if (isDev) {
    settingsWindow.loadURL("http://localhost:5173?window=settings");
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

function getSettingsWindow() {
  return settingsWindow;
}

function getPetWindow() {
  return petWindow;
}

function getChatWindow() {
  return chatWindow;
}

function sendContextToChat(win, text) {
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

module.exports = {
  createPetWindow,
  createChatWindow,
  createSettingsWindow,
  getPetWindow,
  getChatWindow,
  getSettingsWindow,
  sendContextToChat, // ← export this
};
