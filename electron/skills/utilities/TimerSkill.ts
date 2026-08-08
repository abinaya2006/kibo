// TimerSkill.ts
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";

interface TimerArgs {
  seconds: number;
  label: string;
}

const schema: FieldSchema = {
  seconds: {
    type: "number",
    required: true,
    validate: (v) => typeof v === "number" && v > 0 && v <= 3600,
    message: "seconds must be between 1 and 3600",
  },
  label: { type: "string", required: false, default: "Timer" },
};

/**
 * Resolves after the given duration. The registry's own timeout would
 * normally kill a long-running call, so this skill's metadata.timeout
 * is set generously (just over the max allowed seconds) rather than
 * the usual short default.
 */
export class TimerSkill implements Skill<TimerArgs, null> {
  readonly metadata: SkillMetadata = {
    id: "utilities.timer",
    title: "Timer",
    description: "Waits for a given duration, then resolves.",
    category: "utilities",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 3600_000 + 5000, // 1hr max + buffer
    version: "1.0.0",
    tags: ["utilities", "timer"],
  };

  validate(args: unknown): TimerArgs {
    return validateArgs(schema, args) as unknown as TimerArgs;
  }

  async execute(args: TimerArgs): Promise<SkillResult<null>> {
    await new Promise((resolve) => setTimeout(resolve, args.seconds * 1000));
    return { success: true, message: `"${args.label}" finished after ${args.seconds}s` };
  }
}
