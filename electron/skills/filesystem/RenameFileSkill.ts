import fs from "node:fs/promises";
import path from "node:path";
import type { Skill, SkillMetadata, SkillResult, DryRunResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface RenameFileArgs {
  path: string;
  newName: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
  newName: {
    type: "string",
    required: true,
    // newName must be a bare filename — no separators. Renaming across
    // directories is what MoveFileSkill is for; this closes off using
    // "rename" as a disguised move around confirmation/dry-run wiring.
    validate: (v) =>
      typeof v === "string" &&
      v.length > 0 &&
      !v.includes("/") &&
      !v.includes("\\"),
    message: "newName must be a plain filename with no path separators",
  },
};

interface RenameFileData {
  oldPath: string;
  newPath: string;
}

export class RenameFileSkill
  implements Skill<RenameFileArgs, RenameFileData>
{
  readonly metadata: SkillMetadata = {
    id: "filesystem.renameFile",
    title: "Rename File",
    description: "Renames a file within its current folder.",
    category: "filesystem",
    risk: "medium",
    undoable: true,
    requiresConfirmation: true,
    supportsDryRun: true,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "rename"],
  };

  validate(args: unknown): RenameFileArgs {
    return validateArgs(schema, args) as unknown as RenameFileArgs;
  }

  private resolveTarget(args: RenameFileArgs) {
    const safeOldPath = resolveSandboxedPath(args.path);
    const newRelativePath = path.join(path.dirname(args.path), args.newName);
    const safeNewPath = resolveSandboxedPath(newRelativePath);
    return { safeOldPath, safeNewPath, newRelativePath };
  }

  async dryRun(args: RenameFileArgs): Promise<DryRunResult> {
    try {
      const { safeOldPath, safeNewPath, newRelativePath } =
        this.resolveTarget(args);
      const [sourceExists, destExists] = await Promise.all([
        exists(safeOldPath),
        exists(safeNewPath),
      ]);
      if (!sourceExists) {
        return { message: `"${args.path}" does not exist — nothing to rename` };
      }
      if (destExists) {
        return {
          message: `Would rename "${args.path}" to "${args.newName}" — WARNING: a file already exists at "${newRelativePath}" and would be overwritten`,
        };
      }
      return { message: `Would rename "${args.path}" to "${args.newName}"` };
    } catch (err) {
      return { message: `Cannot preview rename: ${(err as Error).message}` };
    }
  }

  async execute(args: RenameFileArgs): Promise<SkillResult<RenameFileData>> {
    try {
      const { safeOldPath, safeNewPath, newRelativePath } =
        this.resolveTarget(args);
      await fs.rename(safeOldPath, safeNewPath);
      return {
        success: true,
        data: { oldPath: args.path, newPath: newRelativePath },
        message: `Renamed "${args.path}" to "${args.newName}"`,
      };
    } catch (err) {
      return failFromError(err, "Failed to rename file");
    }
  }

  async undo(
    args: RenameFileArgs,
    previousResult: SkillResult<RenameFileData>,
  ): Promise<SkillResult> {
    if (!previousResult.success || !previousResult.data) {
      return { success: false, message: "Nothing to undo" };
    }
    try {
      const safeNewPath = resolveSandboxedPath(previousResult.data.newPath);
      const safeOldPath = resolveSandboxedPath(previousResult.data.oldPath);
      await fs.rename(safeNewPath, safeOldPath);
      return {
        success: true,
        message: `Renamed "${previousResult.data.newPath}" back to "${previousResult.data.oldPath}"`,
      };
    } catch (err) {
      return failFromError(err, "Failed to undo rename");
    }
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
