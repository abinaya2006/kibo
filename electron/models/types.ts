/**
 * Core types for Kibo's Skill system.
 * Everything else in the pipeline (Registry, PermissionManager, Planner)
 * depends on these shapes. Keep this file dependency-free.
 */

export type SkillRisk = "low" | "medium" | "high";

export interface SkillMetadata {
  /** Unique id, e.g. "filesystem.move" */
  id: string;
  /** Human-readable name shown in UI/logs, e.g. "Move File" */
  title: string;
  /** Short description of what the skill does */
  description: string;
  /** Grouping used by the capability graph, e.g. "filesystem" */
  category: string;
  /** Static risk level — NEVER inferred by the model at runtime */
  risk: SkillRisk;
  /** Whether this action can be undone via skill.undo() */
  undoable: boolean;
  /** Whether execution must pause for explicit user confirmation */
  requiresConfirmation: boolean;
  /** Whether skill.dryRun() is implemented and should be called first */
  supportsDryRun: boolean;
  /** Max execution time in ms before the registry aborts the call */
  timeout: number;
  /** Semver-ish version string, for future skill versioning */
  version: string;
  /** Free-form tags for search/discovery */
  tags: string[];
}

export interface SkillResult<TData = unknown> {
  success: boolean;
  data?: TData;
  /** Human-readable summary, e.g. "Moved 37 files, skipped 2 duplicates" */
  message: string;
  error?: string;
}

export interface DryRunResult<TData = unknown> {
  /** Human-readable preview, e.g. "Would move 482 files, create 12 folders" */
  message: string;
  data?: TData;
}

/**
 * Every capability in Kibo implements this interface.
 * TArgs should be a plain, JSON-serializable shape (this is what
 * crosses the IPC boundary and what the AI planner will emit).
 */
export interface Skill<TArgs = Record<string, unknown>, TData = unknown> {
  readonly metadata: SkillMetadata;

  /**
   * Validate raw args before execution. Should throw a descriptive
   * error (or return a typed/normalized version of TArgs) if invalid.
   * Called by the Registry BEFORE execute() — skills should never
   * need to re-validate internally.
   */
  validate(args: unknown): TArgs;

  /** Perform the action for real. */
  execute(args: TArgs): Promise<SkillResult<TData>>;

  /**
   * Optional: describe what execute() WOULD do, without doing it.
   * Required (by convention, enforced at registration) if
   * metadata.supportsDryRun is true.
   */
  dryRun?(args: TArgs): Promise<DryRunResult>;

  /**
   * Optional: reverse a previous execute() call.
   * Required (by convention, enforced at registration) if
   * metadata.undoable is true.
   */
  undo?(args: TArgs, previousResult: SkillResult<TData>): Promise<SkillResult>;
}

/** A single entry in the Registry's in-memory audit trail. */
export interface AuditEntry {
  timestamp: number;
  skillId: string;
  args: unknown;
  result: SkillResult | { success: false; error: string; message: string };
  durationMs: number;
}
