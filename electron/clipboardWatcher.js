const { globalShortcut, clipboard } = require("electron");
const { getPetWindow, createChatWindow } = require("./windowManager");
const { exec } = require("child_process");

function registerShortcut(windowManager) {
  // Alt+Shift+A triggers "Ask Luna" text-selection snapshotting
  globalShortcut.register("Alt+Shift+A", () => {
    captureHighlightedText();
  });
}

function unregisterShortcut() {
  globalShortcut.unregisterAll();
}

function captureHighlightedText() {
  const activeWindow = getPetWindow();
  if (!activeWindow) return;

  // Clipboard simulation on Windows using PowerShell to send Ctrl+C keystrokes
  if (process.platform === "win32") {
    // Execute PowerShell command that sends standard Copy command safely
    const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`;
    exec(command, (err) => {
      // Let clipboard refresh buffer
      setTimeout(() => {
        const selectedText = clipboard.readText().trim();
        if (selectedText) {
          dispatchSelection(selectedText);
        }
      }, 150);
    });
  } else {
    // fallback clipboard grab
    const selectedText = clipboard.readText().trim();
    if (selectedText) {
      dispatchSelection(selectedText);
    }
  }
}

function dispatchSelection(text) {
  const petWin = getPetWindow();
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("selection:captured", text);
  }

  // Open & activate chat screen automatically
  // createChatWindow();
}

module.exports = {
  registerShortcut,
  unregisterShortcut,
  captureHighlightedText,
};
