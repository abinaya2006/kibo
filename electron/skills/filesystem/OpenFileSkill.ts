// OpenFileSkill.ts
import { shell } from "electron";
import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface OpenFileArgs {
  path: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
};

export class OpenFileSkill implements Skill<OpenFileArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.openFile",
    title: "Open File",
    description: "Opens a file with the system's default application.",
    category: "filesystem",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "open"],
  };

  validate(args: unknown): OpenFileArgs {
    return validateArgs(schema, args) as unknown as OpenFileArgs;
  }

  async execute(args: OpenFileArgs): Promise<SkillResult<null>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      const stat = await fs.stat(safePath).catch(() => null);
      if (!stat || !stat.isFile()) {
        return {
          success: false,
          message: "Path is not a file",
          error: "NOT_A_FILE",
        };
      }
      const err = await shell.openPath(safePath);
      if (err) {
        return { success: false, message: "Failed to open file", error: err };
      }
      return { success: true, message: `Opened file "${args.path}"` };
    } catch (err) {
      return failFromError(err, "Failed to open file");
    }
  }
}
