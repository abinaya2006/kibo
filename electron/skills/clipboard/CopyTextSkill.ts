// CopyTextSkill.ts
import { clipboard } from "electron";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";

interface CopyTextArgs {
  text: string;
}

const schema: FieldSchema = {
  text: { type: "string", required: true },
};

export class CopyTextSkill implements Skill<CopyTextArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "clipboard.copyText",
    title: "Copy Text",
    description: "Writes text to the system clipboard.",
    category: "clipboard",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 3000,
    version: "1.0.0",
    tags: ["clipboard", "write"],
  };

  validate(args: unknown): CopyTextArgs {
    return validateArgs(schema, args) as unknown as CopyTextArgs;
  }

  async execute(args: CopyTextArgs): Promise<SkillResult<null>> {
    clipboard.writeText(args.text);
    return { success: true, message: "Copied text to clipboard" };
  }
}
