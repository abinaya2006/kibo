import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface WriteFileArgs {
  path: string;
  content: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
  content: { type: "string", required: true },
};

interface WriteFileData {
  bytesWritten: number;
  overwrote: boolean;
}

/**
 * Overwrites (or creates) a file. Distinct from CreateFileSkill because
 * this one is allowed to clobber existing content — hence medium risk
 * and a confirmation gate, per KIBO_ARCHITECTURE.md §5.
 */
export class WriteFileSkill implements Skill<WriteFileArgs, WriteFileData> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.writeFile",
    title: "Write File",
    description: "Writes content to a file, overwriting it if it already exists.",
    category: "filesystem",
    risk: "medium",
    undoable: false, // would need a content snapshot to undo safely; not yet implemented
    requiresConfirmation: true,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "write"],
  };

  validate(args: unknown): WriteFileArgs {
    return validateArgs(schema, args) as unknown as WriteFileArgs;
  }

  async execute(args: WriteFileArgs): Promise<SkillResult<WriteFileData>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      let overwrote = false;
      try {
        await fs.access(safePath);
        overwrote = true;
      } catch {
        // doesn't exist yet — fine, this is a plain create-via-write
      }
      await fs.writeFile(safePath, args.content, "utf-8");
      const bytesWritten = Buffer.byteLength(args.content, "utf-8");
      return {
        success: true,
        data: { bytesWritten, overwrote },
        message: overwrote
          ? `Overwrote ${args.path} (${bytesWritten} bytes)`
          : `Wrote ${args.path} (${bytesWritten} bytes)`,
      };
    } catch (err) {
      return failFromError(err, "Failed to write file");
    }
  }
}
