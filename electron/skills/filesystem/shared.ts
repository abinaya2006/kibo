import type { SkillResult } from "../../models/types.ts";
import { PathSandboxError } from "../../security/PathSandbox.ts";

export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Uniform error → SkillResult mapping, distinguishing sandbox violations
 * from ordinary I/O failures so the UI/audit log can tell them apart. */
export function failFromError(
  err: unknown,
  fallbackMessage: string,
): SkillResult<never> {
  if (err instanceof PathSandboxError) {
    return {
      success: false,
      message: err.message,
      error: "PATH_SANDBOX_VIOLATION",
    };
  }
  return { success: false, message: fallbackMessage, error: errMsg(err) };
}
