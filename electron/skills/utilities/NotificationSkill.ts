// NotificationSkill.ts
import { Notification } from "electron";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";

interface NotificationArgs {
  title: string;
  body: string;
}

const schema: FieldSchema = {
  title: { type: "string", required: true },
  body: { type: "string", required: true },
};

export class NotificationSkill implements Skill<NotificationArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "utilities.notify",
    title: "Notification",
    description: "Shows a system notification.",
    category: "utilities",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 3000,
    version: "1.0.0",
    tags: ["utilities", "notification"],
  };

  validate(args: unknown): NotificationArgs {
    return validateArgs(schema, args) as unknown as NotificationArgs;
  }

  async execute(args: NotificationArgs): Promise<SkillResult<null>> {
    if (!Notification.isSupported()) {
      return { success: false, message: "Notifications not supported on this system", error: "UNSUPPORTED" };
    }
    new Notification({ title: args.title, body: args.body }).show();
    return { success: true, message: "Notification shown" };
  }
}
