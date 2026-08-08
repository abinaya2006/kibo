import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { getAppAdapter } from "../../adapters/index.ts";
import { errMsg } from "../filesystem/shared.ts";

interface CloseAppArgs {
  processName: string;
}

const schema: FieldSchema = {
  processName: {
    type: "string",
    required: true,
    // Bare filename only — no path separators, no shell metacharacters.
    // This goes straight into an execFile arg array, but keeping it
    // narrow closes off any weird edge cases with process-name matching.
    validate: (v) =>
      typeof v === "string" && /^[a-zA-Z0-9_.\-]+$/.test(v),
    message: "processName must be a plain executable/process name",
  },
};

/**
 * Force-closes a running app by process name. Medium risk: unlike
 * filesystem deletes there's no trash/undo equivalent for a killed
 * process — unsaved work in that app is just gone.
 */
export class CloseAppSkill implements Skill<CloseAppArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "apps.close",
    title: "Close App",
    description: "Force-closes a running application by process name.",
    category: "apps",
    risk: "medium",
    undoable: false,
    requiresConfirmation: true,
    supportsDryRun: false,
    timeout: 8000,
    version: "1.0.0",
    tags: ["apps", "close"],
  };

  validate(args: unknown): CloseAppArgs {
    return validateArgs(schema, args) as unknown as CloseAppArgs;
  }

  async execute(args: CloseAppArgs): Promise<SkillResult<null>> {
    try {
      const adapter = getAppAdapter();
      await adapter.closeApp(args.processName);
      return { success: true, message: `Closed "${args.processName}"` };
    } catch (err) {
      return { success: false, message: "Failed to close app", error: errMsg(err) };
    }
  }
}
