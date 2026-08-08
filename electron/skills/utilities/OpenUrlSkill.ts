import { shell } from "electron";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { errMsg } from "../filesystem/shared.ts";

interface OpenUrlArgs {
  url: string;
}

const schema: FieldSchema = {
  url: {
    type: "string",
    required: true,
    // Only http/https — closes off file://, javascript:, custom protocol
    // handlers, etc. from being triggered via this skill.
    validate: (v) => {
      try {
        const u = new URL(v as string);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    message: "url must be a valid http(s) URL",
  },
};

export class OpenUrlSkill implements Skill<OpenUrlArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "utilities.openUrl",
    title: "Open URL",
    description: "Opens a URL in the default browser.",
    category: "utilities",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["utilities", "browser"],
  };

  validate(args: unknown): OpenUrlArgs {
    return validateArgs(schema, args) as unknown as OpenUrlArgs;
  }

  async execute(args: OpenUrlArgs): Promise<SkillResult<null>> {
    try {
      await shell.openExternal(args.url);
      return { success: true, message: `Opened "${args.url}"` };
    } catch (err) {
      return { success: false, message: "Failed to open URL", error: errMsg(err) };
    }
  }
}
