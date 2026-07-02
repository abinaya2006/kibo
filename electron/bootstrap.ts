import { skillRegistry } from "./services/SkillRegistry.ts";
import { EchoSkill } from "./skills/test/EchoSkill.ts";

/**
 * Central place where every skill gets registered.
 * Step 3/4 will add real skills here (filesystem, apps, clipboard, etc.)
 * Step 2 will call this once from the Electron main process entry point.
 */
export function bootstrapSkills(): void {
  skillRegistry.register(new EchoSkill());
  // Step 3: filesystem skills go here
  // Step 4: apps / clipboard / system / utility skills go here
}

export { skillRegistry };
