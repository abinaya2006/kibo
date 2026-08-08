// electron/security/PermissionManager.ts
import { randomUUID } from "crypto";
import type { Skill, SkillMetadata } from "../models/types.ts";
import type { BrowserWindow } from "electron";

interface PendingConfirmation {
  resolve: (approved: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ChatWindowBridge {
  getChatWindow: () => BrowserWindow | null;
  /** Opens (or focuses) the chat window and resolves once it exists. Does NOT guarantee loaded. */
  openChatWindow: () => BrowserWindow;
  /** Sends a channel/payload once the window's finished loading, like windowManager's sendContextToChat. */
  sendToChat: (win: BrowserWindow, channel: string, payload: unknown) => void;
}

const CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000; // no answer -> fail closed

export class PermissionManager {
  private bridge: ChatWindowBridge | null = null;
  private pending = new Map<string, PendingConfirmation>();

  /** Call once from main.ts at startup, wiring in windowManager's functions. */
  init(bridge: ChatWindowBridge) {
    this.bridge = bridge;
  }

  requiresConfirmation(metadata: SkillMetadata): boolean {
    return metadata.requiresConfirmation || metadata.risk !== "low";
  }

  async confirm<TArgs>(skill: Skill<TArgs, unknown>, args: TArgs): Promise<boolean> {
    if (!this.requiresConfirmation(skill.metadata)) return true;

    if (!this.bridge) {
      console.error("[PermissionManager] Not initialized — denying by default.");
      return false;
    }

    let preview: unknown = null;
    if (skill.metadata.supportsDryRun && skill.dryRun) {
      try {
        preview = await skill.dryRun(args);
      } catch (err) {
        console.error(`[PermissionManager] dryRun failed for "${skill.metadata.id}":`, err);
        return false; // can't preview -> never execute blind
      }
    }

    const win = this.bridge.getChatWindow() ?? this.bridge.openChatWindow();
    const requestId = randomUUID();

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve(false);
      }, CONFIRMATION_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, timer });

      this.bridge!.sendToChat(win, "skill:confirm-request", {
        requestId,
        skillId: skill.metadata.id,
        title: skill.metadata.title,
        risk: skill.metadata.risk,
        args,
        preview,
      });
    });
  }

  /** Called from ipcMain "skill:confirm-response". */
  resolveConfirmation(requestId: string, approved: boolean): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(approved);
    return true;
  }
}

export const permissionManager = new PermissionManager();
