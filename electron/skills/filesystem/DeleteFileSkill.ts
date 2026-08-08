import fs from "node:fs/promises";
// npm install trash
import trash from "trash";
import type { Skill, SkillMetadata, SkillResult, DryRunResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface DeleteFileArgs {
  path: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
};

interface DeleteFileData {
  deletedPath: string;
}

/**
 * Soft-delete only — routes through the OS trash/recycle bin, never
 * fs.unlink, per KIBO_ARCHITECTURE.md §5 ("Reversibility"). Highest
 * risk tier of the filesystem skills, so it carries both a confirmation
 * gate and a mandatory dry-run.
 *
 * undo() is intentionally NOT implemented: the `trash` package has no
 * programmatic restore API, so "undo" here would be a lie — recovery is
 * via the OS trash/recycle bin UI, which is real but out of this
 * skill's control. undoable stays false so the registry doesn't imply
 * a guarantee this skill can't back up.
 */
export class DeleteFileSkill implements Skill<DeleteFileArgs, DeleteFileData> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.deleteFile",
    title: "Delete File",
    description: "Moves a file to the trash/recycle bin.",
    category: "filesystem",
    risk: "high",
    undoable: false,
    requiresConfirmation: true,
    supportsDryRun: true,
    timeout: 10000,
    version: "1.0.0",
    tags: ["filesystem", "delete"],
  };

  validate(args: unknown): DeleteFileArgs {
    return validateArgs(schema, args) as unknown as DeleteFileArgs;
  }

  async dryRun(args: DeleteFileArgs): Promise<DryRunResult> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      const stat = await fs.stat(safePath).catch(() => null);
      if (!stat) {
        return { message: `"${args.path}" does not exist — nothing to delete` };
      }
      const kind = stat.isDirectory() ? "folder" : "file";
      return {
        message: `Would move ${kind} "${args.path}" to the trash (${stat.size} bytes)`,
      };
    } catch (err) {
      return { message: `Cannot preview delete: ${(err as Error).message}` };
    }
  }

  async execute(args: DeleteFileArgs): Promise<SkillResult<DeleteFileData>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      const exists = await fs.stat(safePath).catch(() => null);
      if (!exists) {
        return {
          success: false,
          message: "File does not exist",
          error: "NOT_FOUND",
        };
      }
      await trash(safePath);
      return {
        success: true,
        data: { deletedPath: args.path },
        message: `Moved "${args.path}" to the trash`,
      };
    } catch (err) {
      return failFromError(err, "Failed to delete file");
    }
  }
}
