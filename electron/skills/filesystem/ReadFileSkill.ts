import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface ReadFileArgs {
  path: string;
}

const schema: FieldSchema = {
  path: { type: "string", required: true },
};

// Refuse to read anything huge into memory / across IPC.
const MAX_READ_BYTES = 5 * 1024 * 1024; // 5 MB

export class ReadFileSkill implements Skill<ReadFileArgs, string> {
  readonly metadata: SkillMetadata = {
    id: "filesystem.readFile",
    title: "Read File",
    description: "Reads the text contents of a file.",
    category: "filesystem",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["filesystem", "read"],
  };

  validate(args: unknown): ReadFileArgs {
    return validateArgs(schema, args) as unknown as ReadFileArgs;
  }

  async execute(args: ReadFileArgs): Promise<SkillResult<string>> {
    try {
      const safePath = resolveSandboxedPath(args.path);
      const stat = await fs.stat(safePath);
      if (!stat.isFile()) {
        return {
          success: false,
          message: "Path is not a file",
          error: "NOT_A_FILE",
        };
      }
      if (stat.size > MAX_READ_BYTES) {
        return {
          success: false,
          message: `File too large to read (${stat.size} bytes, limit ${MAX_READ_BYTES})`,
          error: "FILE_TOO_LARGE",
        };
      }
      const content = await fs.readFile(safePath, "utf-8");
      return {
        success: true,
        data: content,
        message: `Read ${stat.size} bytes from ${args.path}`,
      };
    } catch (err) {
      return failFromError(err, "Failed to read file");
    }
  }
}
