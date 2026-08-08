import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { getAppAdapter, type AppAdapter } from "../../adapters/index.ts";
import { errMsg } from "../filesystem/shared.ts";
import type { InstalledApp } from "../../adapters/WindowsAdapter.ts";

const schema: FieldSchema = {};

export class ListInstalledAppsSkill
  implements Skill<Record<string, never>, InstalledApp[]>
{
  readonly metadata: SkillMetadata = {
    id: "apps.listInstalled",
    title: "List Installed Apps",
    description: "Lists applications available to launch.",
    category: "apps",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 10000,
    version: "1.0.0",
    tags: ["apps", "list"],
  };

  validate(args: unknown): Record<string, never> {
    return validateArgs(schema, args) as Record<string, never>;
  }

  async execute(): Promise<SkillResult<InstalledApp[]>> {
    try {
      const adapter: AppAdapter = getAppAdapter();
      const apps = await adapter.listInstalledApps();
      return { success: true, data: apps, message: `Found ${apps.length} app(s)` };
    } catch (err) {
      return { success: false, message: "Failed to list apps", error: errMsg(err) };
    }
  }
}
