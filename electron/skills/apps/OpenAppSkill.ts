import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { getAppAdapter } from "../../adapters/index.ts";
import { errMsg } from "../filesystem/shared.ts";

interface OpenAppArgs {
  appPath: string;
}

const schema: FieldSchema = {
  appPath: { type: "string", required: true },
};

export class OpenAppSkill implements Skill<OpenAppArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "apps.open",
    title: "Open App",
    description: "Launches an application by its path/shortcut.",
    category: "apps",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 8000,
    version: "1.0.0",
    tags: ["apps", "launch"],
  };

  validate(args: unknown): OpenAppArgs {
    return validateArgs(schema, args) as unknown as OpenAppArgs;
  }

  async execute(args: OpenAppArgs): Promise<SkillResult<null>> {
    try {
      const adapter = getAppAdapter();
      await adapter.launchApp(args.appPath);
      return { success: true, message: `Launched "${args.appPath}"` };
    } catch (err) {
      return { success: false, message: "Failed to launch app", error: errMsg(err) };
    }
  }
}
