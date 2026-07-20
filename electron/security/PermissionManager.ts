import type { Skill, SkillMetadata } from "../models/types.ts";

/**
 * Step 1 stub. Real confirmation UI (chat prompt / dialog) gets wired
 * up in Step 5 once the planner + chat layer exist. For now this just
 * centralizes the decision logic so nothing else has to know how
 * confirmation is actually implemented later.
 */
export class PermissionManager {
  /** Whether this skill call must pause for explicit user confirmation. */
  requiresConfirmation(metadata: SkillMetadata): boolean {
    return metadata.requiresConfirmation || metadata.risk !== "low";
  }

  /**
   * Placeholder confirmation gate. In Step 1 this always resolves true
   * (auto-approve) so the pipeline can be tested end-to-end without a UI.
   * Step 5 replaces this with a real prompt that can resolve false.
   */
  async confirm<TArgs>(skill: Skill<TArgs>, args: TArgs): Promise<boolean> {
    if (this.requiresConfirmation(skill.metadata)) {
      // eslint-disable-next-line no-console
      console.log(
        `[PermissionManager] "${skill.metadata.title}" requires confirmation ` +
          `(risk: ${skill.metadata.risk}). Auto-approving in Step 1 stub.`,
        args,
      );
    }
    return true;
  }
}

export const permissionManager = new PermissionManager();
