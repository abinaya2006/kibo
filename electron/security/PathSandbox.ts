/**
 * Canonicalizes and validates paths before any filesystem skill touches
 * disk. This is the chokepoint that makes "reject `..` traversal, reject
 * paths outside allowed roots" (KIBO_ARCHITECTURE.md §5) actually true,
 * rather than a rule skills are individually trusted to follow.
 */
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export class PathSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSandboxError";
  }
}

// Roots filesystem skills are allowed to touch. Deliberately broad-but-
// bounded (whole home dir) rather than open season on the disk. Widen or
// narrow explicitly here — never let a skill or the planner pass in its
// own root.
const ALLOWED_ROOTS: string[] = [os.homedir()];

/**
 * Resolves `rawPath` to an absolute, canonical path and verifies it falls
 * inside one of ALLOWED_ROOTS. Rejects `..` traversal and symlink escapes,
 * whether the target exists yet or not — safe to call before creating a
 * file too.
 */
export function resolveSandboxedPath(rawPath: string): string {
  if (typeof rawPath !== "string" || rawPath.trim() === "") {
    throw new PathSandboxError("Path must be a non-empty string");
  }

  // Resolve relative to home, never process.cwd() — cwd in a packaged
  // Electron app isn't something callers should be able to rely on.
  const resolved = path.resolve(os.homedir(), rawPath);
  const real = realpathIfPossible(resolved);

  const withinRoot = ALLOWED_ROOTS.some((root) => {
    const realRoot = fs.realpathSync(root);
    const rel = path.relative(realRoot, real);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });

  if (!withinRoot) {
    throw new PathSandboxError(
      `Path "${rawPath}" resolves outside the allowed sandbox`,
    );
  }

  return real;
}

/**
 * Resolves symlinks on the real portion of a path. If the target doesn't
 * exist yet, walks up to the nearest existing ancestor, canonicalizes
 * that (to catch symlink escapes), then reattaches the not-yet-created
 * tail.
 */
function realpathIfPossible(target: string): string {
  try {
    return fs.realpathSync(target);
  } catch {
    const parsed = path.parse(target);
    let current = target;
    const tail: string[] = [];
    while (current !== parsed.root) {
      if (fs.existsSync(current)) break;
      tail.unshift(path.basename(current));
      current = path.dirname(current);
    }
    const realBase = fs.existsSync(current)
      ? fs.realpathSync(current)
      : current;
    return path.join(realBase, ...tail);
  }
}
