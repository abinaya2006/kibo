import type {
  AuditEntry,
  Skill,
  SkillMetadata,
  SkillResult,
} from "../models/types.ts";
import { permissionManager } from "../security/PermissionManager.ts";

const REQUIRED_METADATA_FIELDS: (keyof SkillMetadata)[] = [
  "id",
  "title",
  "description",
  "category",
  "risk",
  "undoable",
  "requiresConfirmation",
  "supportsDryRun",
  "timeout",
  "version",
  "tags",
];

export class SkillRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillRegistrationError";
  }
}

export class SkillExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillExecutionError";
  }
}

/**
 * The single chokepoint for registering and executing Skills.
 *
 * Nothing else in the app (planner, IPC handlers, chat controller)
 * should call fs/child_process/etc. directly — everything goes
 * through registry.execute(skillId, args).
 */
export class SkillRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private skills = new Map<string, Skill<any, any>>();
  private auditLog: AuditEntry[] = [];

  /**
   * Register a skill. Fails closed: incomplete metadata or a
   * missing dryRun/undo implementation that the metadata claims
   * to support means the skill is rejected outright, not loaded
   * in a half-safe state.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(skill: Skill<any, any>): void {
    const { metadata } = skill;

    for (const field of REQUIRED_METADATA_FIELDS) {
      if (metadata[field] === undefined || metadata[field] === null) {
        throw new SkillRegistrationError(
          `Cannot register skill: missing metadata field "${String(field)}"`,
        );
      }
    }

    if (this.skills.has(metadata.id)) {
      throw new SkillRegistrationError(
        `Skill "${metadata.id}" is already registered`,
      );
    }

    if (metadata.supportsDryRun && typeof skill.dryRun !== "function") {
      throw new SkillRegistrationError(
        `Skill "${metadata.id}" declares supportsDryRun but has no dryRun()`,
      );
    }

    if (metadata.undoable && typeof skill.undo !== "function") {
      throw new SkillRegistrationError(
        `Skill "${metadata.id}" declares undoable but has no undo()`,
      );
    }

    if (typeof skill.validate !== "function") {
      throw new SkillRegistrationError(
        `Skill "${metadata.id}" must implement validate()`,
      );
    }

    if (typeof skill.execute !== "function") {
      throw new SkillRegistrationError(
        `Skill "${metadata.id}" must implement execute()`,
      );
    }

    this.skills.set(metadata.id, skill);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(skillId: string): Skill<any, any> | undefined {
    return this.skills.get(skillId);
  }

  /** For the future planner: "which capabilities exist right now?" */
  listSkills(): SkillMetadata[] {
    return Array.from(this.skills.values()).map((s) => s.metadata);
  }

  listByCategory(category: string): SkillMetadata[] {
    return this.listSkills().filter((m) => m.category === category);
  }

  getAuditLog(): ReadonlyArray<AuditEntry> {
    return this.auditLog;
  }

  /**
   * Validate → (confirm if required) → execute, with timeout enforcement
   * and a guaranteed audit entry regardless of outcome.
   */
  async execute(skillId: string, rawArgs: unknown): Promise<SkillResult> {
    const skill = this.skills.get(skillId);
    const startedAt = Date.now();

    if (!skill) {
      const result: SkillResult = {
        success: false,
        message: `No such skill: "${skillId}"`,
        error: "SKILL_NOT_FOUND",
      };
      this.recordAudit(skillId, rawArgs, result, startedAt);
      return result;
    }

    try {
      const args = skill.validate(rawArgs);

      const approved = await permissionManager.confirm(skill, args);
      if (!approved) {
        const result: SkillResult = {
          success: false,
          message: `Action "${skill.metadata.title}" was not confirmed`,
          error: "NOT_CONFIRMED",
        };
        this.recordAudit(skillId, args, result, startedAt);
        return result;
      }

      const result = await this.withTimeout(
        skill.execute(args),
        skill.metadata.timeout,
        skill.metadata.id,
      );

      this.recordAudit(skillId, args, result, startedAt);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const result: SkillResult = {
        success: false,
        message: `Skill "${skillId}" failed: ${message}`,
        error: message,
      };
      this.recordAudit(skillId, rawArgs, result, startedAt);
      return result;
    }
  }

  /** Preview a skill's effect without executing it. */
  async dryRun(skillId: string, rawArgs: unknown) {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new SkillExecutionError(`No such skill: "${skillId}"`);
    }
    if (!skill.dryRun) {
      throw new SkillExecutionError(
        `Skill "${skillId}" does not support dry-run`,
      );
    }
    const args = skill.validate(rawArgs);
    return skill.dryRun(args);
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    skillId: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new SkillExecutionError(
              `Skill "${skillId}" timed out after ${timeoutMs}ms`,
            ),
          ),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private recordAudit(
    skillId: string,
    args: unknown,
    result: SkillResult,
    startedAt: number,
  ): void {
    this.auditLog.push({
      timestamp: startedAt,
      skillId,
      args,
      result,
      durationMs: Date.now() - startedAt,
    });
  }
}

export const skillRegistry = new SkillRegistry();
