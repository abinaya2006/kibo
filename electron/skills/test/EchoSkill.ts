import type { Skill, SkillMetadata, SkillResult } from "../../models/types.ts";
import type { FieldSchema } from "../../security/ActionSchema.ts";
import { validateArgs } from "../../security/ActionSchema.ts";

interface EchoArgs {
  message: string;
}

const schema: FieldSchema = {
  message: { type: "string", required: true },
};

/**
 * Does nothing real — just proves that
 * register -> validate -> confirm -> execute -> audit
 * works end to end before any OS access is wired up.
 */
export class EchoSkill implements Skill<EchoArgs, string> {
  readonly metadata: SkillMetadata = {
    id: "test.echo",
    title: "Echo",
    description: "Returns the message it was given. Used to test the pipeline.",
    category: "test",
    risk: "low",
    undoable: false,
    requiresConfirmation: false,
    supportsDryRun: false,
    timeout: 5000,
    version: "1.0.0",
    tags: ["test", "debug"],
  };

  validate(args: unknown): EchoArgs {
    return validateArgs(schema, args) as unknown as EchoArgs;
  }

  async execute(args: EchoArgs): Promise<SkillResult<string>> {
    return {
      success: true,
      data: args.message,
      message: `Echoed: "${args.message}"`,
    };
  }
}
