/**
 * Step 1 checkpoint script.
 *
 * Run with: npx ts-node electron/__test__/registry.test.ts
 *
 * This is the "done when" check for Step 1 — no Electron app,
 * no IPC, just proof that register -> validate -> execute -> audit
 * works through the SkillRegistry alone.
 */
import { bootstrapSkills, skillRegistry } from "../bootstrap";

async function main() {
  bootstrapSkills();

  console.log("Registered skills:", skillRegistry.listSkills().map((s) => s.id));

  // 1. Happy path
  const ok = await skillRegistry.execute("test.echo", { message: "hello kibo" });
  console.log("Happy path result:", ok);

  // 2. Missing required field -> should fail validation, not throw uncaught
  const missingField = await skillRegistry.execute("test.echo", {});
  console.log("Missing field result:", missingField);

  // 3. Unknown extra field -> should fail closed
  const extraField = await skillRegistry.execute("test.echo", {
    message: "hi",
    extra: "not allowed",
  });
  console.log("Extra field result:", extraField);

  // 4. Unknown skill id -> should return a clean error, not throw
  const unknownSkill = await skillRegistry.execute("does.not.exist", {});
  console.log("Unknown skill result:", unknownSkill);

  console.log("\nAudit log:");
  console.log(JSON.stringify(skillRegistry.getAuditLog(), null, 2));
}

main().catch((err) => {
  console.error("Unexpected failure in registry test:", err);
  process.exit(1);
});
