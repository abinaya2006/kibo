import { globalShortcut, clipboard } from "electron";
import { getPetWindow } from "./windowManager.js";
import { exec } from "child_process";

// Save clipboard before we send Ctrl+C so we can restore it after
let previousClipboard = "";

export function registerShortcut() {
  globalShortcut.register("Alt+Shift+A", () => {
    captureHighlightedText();
  });
}

export function unregisterShortcut() {
  globalShortcut.unregisterAll();
}

export function captureHighlightedText() {
  const activeWindow = getPetWindow();
  if (!activeWindow) return;

  if (process.platform === "win32") {
    // Save what's currently on the clipboard so we can restore it
    previousClipboard = clipboard.readText();
    // Clear clipboard first so we can detect if Ctrl+C actually wrote anything
    clipboard.writeText("");
    // Use -NonInteractive -NoProfile to skip PowerShell startup overhead
    // noprofile alone cuts ~400ms off launch time
    const command = `powershell -NonInteractive -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.SendKeys]::SendWait('^c')"`;
    exec(command, { timeout: 3000 }, () => {
      // Poll clipboard instead of fixed timeout — faster when it works, capped at 1s
      pollClipboard(0);
    });
  } else {
    // macOS / Linux — clipboard already has selection after hotkey
    const selectedText = clipboard.readText().trim();
    if (selectedText) {
      dispatchSelection(selectedText);
    }
  }
}

// Poll clipboard every 50ms up to 1000ms waiting for Ctrl+C to land
function pollClipboard(attempts) {
  const MAX_ATTEMPTS = 20; // 20 * 50ms = 1000ms max wait
  const POLL_INTERVAL = 50;
  const text = clipboard.readText().trim();
  if (text && text !== previousClipboard.trim()) {
    // Got new text — dispatch it and restore previous clipboard
    dispatchSelection(text);
    // Restore original clipboard after a short delay
    setTimeout(() => clipboard.writeText(previousClipboard), 500);
    return;
  }
  if (attempts >= MAX_ATTEMPTS) {
    // Nothing captured — restore clipboard and give up silently
    clipboard.writeText(previousClipboard);
    return;
  }
  setTimeout(() => pollClipboard(attempts + 1), POLL_INTERVAL);
}

function dispatchSelection(text) {
  const petWin = getPetWindow();
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("selection:captured", text);
  }
}
