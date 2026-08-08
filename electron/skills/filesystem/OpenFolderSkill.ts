// OpenFolderSkill.ts
import { shell } from "electron";
import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface OpenFolderArgs {
  path: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
};

export class OpenFolderSkill implements Skill<OpenFolderArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.openFolder",
    title: "Open Folder",
    description: "Opens a folder in the system file explorer.",
    category: "filesystem",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "open"],
  };

  validate(args: unknown): OpenFolderArgs {
    return validateArgs(schema, args) as unknown as OpenFolderArgs;
  }

  async execute(args: OpenFolderArgs): Promise<SkillResult<null>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      const stat = await fs.stat(safePath).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        return {
          success: false,
          message: "Path is not a folder",
          error: "NOT_A_DIRECTORY",
        };
      }
      const err = await shell.openPath(safePath);
      if (err) {
        return { success: false, message: "Failed to open folder", error: err };
      }
      return { success: true, message: `Opened folder "${args.path}"` };
    } catch (err) {
      return failFromError(err, "Failed to open folder");
    }
  }
}
