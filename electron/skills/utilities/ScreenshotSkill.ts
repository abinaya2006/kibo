import { desktopCapturer, screen } from "electron";
import fs from "node:fs/promises";
import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";
import { resolveSandboxedPath } from "../../security/PathSandbox.ts";
import { failFromError } from "../filesystem/shared.ts";

interface ScreenshotArgs {
  savePath: string;
}

const schema: FieldSchema = {
  savePath: { type: "string", required: true },
};

interface ScreenshotData {
  savedPath: string;
}

export class ScreenshotSkill implements Skill<ScreenshotArgs, ScreenshotData> {
  readonly metadata: SkillMetadata = {
    id: "utilities.screenshot",
    title: "Screenshot",
    description: "Captures the primary display and saves it as a PNG.",
    category: "utilities",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 8000,
    version: "1.0.0",
    tags: ["utilities", "screenshot"],
  };

  validate(args: unknown): ScreenshotArgs {
    return validateArgs(schema, args) as unknown as ScreenshotArgs;
  }

  async execute(args: ScreenshotArgs): Promise<SkillResult<ScreenshotData>> {
    try {
      const safePath = resolveSandboxedPath(args.savePath);
      const display = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: display.size,
      });
      const primary = sources[0];
      if (!primary) {
        return { success: false, message: "No screen source available", error: "NO_SOURCE" };
      }
      const png = primary.thumbnail.toPNG();
      await fs.writeFile(safePath, png);
      return {
        success: true,
        data: { savedPath: args.savePath },
        message: `Saved screenshot to "${args.savePath}"`,
      };
    } catch (err) {
      return failFromError(err, "Failed to take screenshot");
    }
  }
}
