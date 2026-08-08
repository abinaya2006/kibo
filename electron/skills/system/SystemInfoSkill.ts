import si from "systeminformation";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { errMsg } from "../filesystem/shared.ts";

interface SystemInfoArgs {
  metric: "battery" | "cpu" | "ram" | "storage" | "processes";
}

const schema: FieldSchema = {
  metric: {
    type: "string",
    required: true,
    validate: (v) =>
      typeof v === "string" &&
      ["battery", "cpu", "ram", "storage", "processes"].includes(v),
    message: 'metric must be one of "battery" | "cpu" | "ram" | "storage" | "processes"',
  },
};

/**
 * One skill covering all five v1 System metrics (KIBO_ARCHITECTURE.md §6)
 * rather than five near-identical skills — they're all read-only,
 * same risk profile, same shape of call.
 */
export class SystemInfoSkill implements Skill<SystemInfoArgs, unknown> {
  readonly metadata: SkillMetadata = {
    id: "system.info",
    title: "System Info",
    description: "Reads battery, CPU, RAM, storage, or running process info.",
    category: "system",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 8000,
    version: "1.0.0",
    tags: ["system", "info"],
  };

  validate(args: unknown): SystemInfoArgs {
    return validateArgs(schema, args) as unknown as SystemInfoArgs;
  }

  async execute(args: SystemInfoArgs): Promise<SkillResult<unknown>> {
    try {
      switch (args.metric) {
        case "battery": {
          const data = await si.battery();
          return { success: true, data, message: `Battery: ${data.percent}%` };
        }
        case "cpu": {
          const [info, load] = await Promise.all([si.cpu(), si.currentLoad()]);
          return {
            success: true,
            data: { info, load: load.currentLoad },
            message: `CPU load: ${load.currentLoad.toFixed(1)}%`,
          };
        }
        case "ram": {
          const data = await si.mem();
          return {
            success: true,
            data,
            message: `RAM: ${(data.active / 1e9).toFixed(1)}GB / ${(data.total / 1e9).toFixed(1)}GB used`,
          };
        }
        case "storage": {
          const data = await si.fsSize();
          return { success: true, data, message: `Found ${data.length} storage volume(s)` };
        }
        case "processes": {
          const data = await si.processes();
          return {
            success: true,
            data: data.list.slice(0, 50), // cap payload size across IPC
            message: `${data.all} process(es) running (showing top 50)`,
          };
        }
      }
    } catch (err) {
      return { success: false, message: `Failed to read ${args.metric}`, error: errMsg(err) };
    }
  }
}
