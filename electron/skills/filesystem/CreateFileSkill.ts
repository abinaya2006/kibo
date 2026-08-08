import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface CreateFileArgs {
  path: string;
  content: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
  content: { type: "string", required: false, default: "" },
};

interface CreateFileData {
  createdPath: string;
}

/**
 * Creates a NEW file. Fails if one already exists at that path — this is
 * the safe, low-risk counterpart to WriteFileSkill, which is the one
 * allowed to overwrite. Keeping these separate means "create" never
 * needs a confirmation gate.
 */
export class CreateFileSkill
  implements Skill<CreateFileArgs, CreateFileData>
{
  readonly metadata: SkillMetadata = {
    id: "filesystem.createFile",
    title: "Create File",
    description: "Creates a new file with the given content. Fails if the file already exists.",
    category: "filesystem",
    risk: "low",
    undoable: true,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "write", "create"],
  };

  validate(args: unknown): CreateFileArgs {
    return validateArgs(schema, args) as unknown as CreateFileArgs;
  }

  async execute(args: CreateFileArgs): Promise<SkillResult<CreateFileData>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      // wx flag: fail if the file already exists (atomic check+create).
      await fs.writeFile(safePath, args.content ?? "", { flag: "wx" });
      return {
        success: true,
        data: { createdPath: args.path },
        message: `Created ${args.path}`,
      };
    } catch (err: any) {
      if (err?.code === "EEXIST") {
        return {
          success: false,
          message: "A file already exists at that path",
          error: "FILE_EXISTS",
        };
      }
      return failFromError(err, "Failed to create file");
    }
  }

  async undo(
    args: CreateFileArgs,
    previousResult: SkillResult<CreateFileData>,
  ): Promise<SkillResult> {
    if (!previousResult.success) {
      return { success: false, message: "Nothing to undo" };
    }
    try {
      const safePath = resolveSandboxedPath(args.path);
      await fs.unlink(safePath);
      return { success: true, message: `Removed ${args.path}` };
    } catch (err) {
      return failFromError(err, "Failed to undo file creation");
    }
  }
}
