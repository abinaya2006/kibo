import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult, DryRunResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface MoveFileArgs {
  source: string;
  destination: string;
  overwrite: boolean;
}

const schema: FieldSchema = {
  source: { type: "string", required: true },
  destination: { type: "string", required: true },
  overwrite: { type: "boolean", required: false, default: false },
};

interface MoveFileData {
  from: string;
  to: string;
  overwrote: boolean;
}

export class MoveFileSkill implements Skill<MoveFileArgs, MoveFileData> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.moveFile",
    title: "Move File",
    description: "Moves a file to a different location.",
    category: "filesystem",
    risk: "medium",
    undoable: true,
    requiresConfirmation: true,
    supportsDryRun: true,
    timeout: 10000,
    version: "1.0.0",
    tags: ["filesystem", "move"],
  };

  validate(args: unknown): MoveFileArgs {
    return validateArgs(schema, args) as unknown as MoveFileArgs;
  }

  async dryRun(args: MoveFileArgs): Promise<DryRunResult> {
    try {
      const safeSource = resolveSandboxedPath(args.source);
      const safeDest = resolveSandboxedPath(args.destination);
      const [sourceExists, destExists] = await Promise.all([
        exists(safeSource),
        exists(safeDest),
      ]);
      if (!sourceExists) {
        return { message: `"${args.source}" does not exist — nothing to move` };
      }
      if (destExists && !args.overwrite) {
        return {
          message: `Would move "${args.source}" to "${args.destination}" — BLOCKED: destination already exists and overwrite is false`,
        };
      }
      if (destExists && args.overwrite) {
        return {
          message: `Would move "${args.source}" to "${args.destination}" — WARNING: this overwrites an existing file`,
        };
      }
      return { message: `Would move "${args.source}" to "${args.destination}"` };
    } catch (err) {
      return { message: `Cannot preview move: ${(err as Error).message}` };
    }
  }

  async execute(args: MoveFileArgs): Promise<SkillResult<MoveFileData>> {
    try {
      const safeSource = resolveSandboxedPath(args.source);
      const safeDest = resolveSandboxedPath(args.destination);

      if (!args.overwrite && (await exists(safeDest))) {
        return {
          success: false,
          message: "Destination already exists and overwrite was not set",
          error: "DESTINATION_EXISTS",
        };
      }

      await fs.rename(safeSource, safeDest);
      return {
        success: true,
        data: { from: args.source, to: args.destination, overwrote: args.overwrite },
        message: `Moved "${args.source}" to "${args.destination}"`,
      };
    } catch (err) {
      return failFromError(err, "Failed to move file");
    }
  }

  async undo(
    args: MoveFileArgs,
    previousResult: SkillResult<MoveFileData>,
  ): Promise<SkillResult> {
    if (!previousResult.success || !previousResult.data) {
      return { success: false, message: "Nothing to undo" };
    }
    if (previousResult.data.overwrote) {
      // We clobbered whatever was at the destination — moving back would
      // not restore it, so undo would silently lose that overwritten
      // file's replacement. Refuse rather than pretend to be safe.
      return {
        success: false,
        message: "Cannot safely undo a move that overwrote an existing file",
        error: "UNDO_UNSAFE_AFTER_OVERWRITE",
      };
    }
    try {
      const safeTo = resolveSandboxedPath(previousResult.data.to);
      const safeFrom = resolveSandboxedPath(previousResult.data.from);
      await fs.rename(safeTo, safeFrom);
      return {
        success: true,
        message: `Moved "${previousResult.data.to}" back to "${previousResult.data.from}"`,
      };
    } catch (err) {
      return failFromError(err, "Failed to undo move");
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
