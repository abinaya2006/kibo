import fs from "node:fs/promises";
import path from "node:path";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "./shared.ts";

interface SearchFilesArgs {
  root: string;
  query: string;
}

const schema: FieldSchema = {
  root: { type: "string", required: true },
  query: { type: "string", required: true },
};

const MAX_RESULTS = 200;
const MAX_DEPTH = 12;

interface SearchFilesData {
  matches: string[];
  truncated: boolean;
}

export class SearchFilesSkill
  implements Skill<SearchFilesArgs, SearchFilesData>
{
  readonly metadata: SkillMetadata = {
    id: "filesystem.searchFiles",
    title: "Search Files",
    description: "Searches for files whose name contains the given text, starting from a folder.",
    category: "filesystem",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 15000,
    version: "1.0.0",
    tags: ["filesystem", "search"],
  };

  validate(args: unknown): SearchFilesArgs {
    return validateArgs(schema, args) as unknown as SearchFilesArgs;
  }

  async execute(
    args: SearchFilesArgs,
  ): Promise<SkillResult<SearchFilesData>> {
    try {
      const safeRoot = resolveSandboxedPath(args.root);
      const stat = await fs.stat(safeRoot).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        return {
          success: false,
          message: "Root is not a folder",
          error: "NOT_A_DIRECTORY",
        };
      }

      const matches: string[] = [];
      const queryLower = args.query.toLowerCase();
      let truncated = false;

      const walk = async (dir: string, depth: number): Promise<void> => {
        if (matches.length >= MAX_RESULTS || depth > MAX_DEPTH) {
          if (matches.length >= MAX_RESULTS) truncated = true;
          return;
        }
        let entries;
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
          return; // permission errors etc — skip silently
        }
        for (const entry of entries) {
          if (matches.length >= MAX_RESULTS) {
            truncated = true;
            return;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.name.toLowerCase().includes(queryLower)) {
            matches.push(path.relative(safeRoot, fullPath));
          }
          if (entry.isDirectory()) {
            await walk(fullPath, depth + 1);
          }
        }
      };

      await walk(safeRoot, 0);

      return {
        success: true,
        data: { matches, truncated },
        message: `Found ${matches.length} match(es)${truncated ? " (truncated)" : ""}`,
      };
    } catch (err) {
      return failFromError(err, "Failed to search files");
    }
  }
}
