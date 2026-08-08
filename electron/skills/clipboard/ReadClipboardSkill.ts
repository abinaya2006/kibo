// ReadClipboardSkill.ts
import { clipboard } from "electron";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";

const schema: FieldSchema = {};

export class ReadClipboardSkill
  implements Skill<Record<string, never>, string>
{
  readonly metadata: SkillMetadata = {
    id: "clipboard.read",
    title: "Read Clipboard",
    description: "Reads the current text on the system clipboard.",
    category: "clipboard",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 3000,
    version: "1.0.0",
    tags: ["clipboard", "read"],
  };

  validate(args: unknown): Record<string, never> {
    return validateArgs(schema, args) as Record<string, never>;
  }

  async execute(): Promise<SkillResult<string>> {
    const text = clipboard.readText();
    return { success: true, data: text, message: `Read ${text.length} character(s)` };
  }
}
