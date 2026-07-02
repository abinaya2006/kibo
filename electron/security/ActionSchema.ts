/**
 * Minimal, dependency-free arg validation.
 *
 * If you later want richer validation (unions, refinements, etc.),
 * swap this out for zod without changing the Skill interface —
 * skill.validate() just needs to keep returning a typed TArgs or throwing.
 *
 * Usage inside a skill:
 *
 *   const schema: FieldSchema = {
 *     source: { type: "string", required: true },
 *     destination: { type: "string", required: true },
 *     overwrite: { type: "boolean", required: false, default: false },
 *   };
 *
 *   validate(args: unknown) {
 *     return validateArgs(schema, args) as MoveFileArgs;
 *   }
 */

export type FieldType = "string" | "number" | "boolean" | "object" | "array";

export interface FieldRule {
  type: FieldType;
  required: boolean;
  default?: unknown;
  /** Optional extra check, e.g. non-empty string, positive number */
  validate?: (value: unknown) => boolean;
  /** Message shown if `validate` returns false */
  message?: string;
}

export type FieldSchema = Record<string, FieldRule>;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateArgs(
  schema: FieldSchema,
  rawArgs: unknown
): Record<string, unknown> {
  if (typeof rawArgs !== "object" || rawArgs === null) {
    throw new ValidationError("Args must be an object");
  }

  const input = rawArgs as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const hasValue = Object.prototype.hasOwnProperty.call(input, field);

    if (!hasValue) {
      if (rule.required) {
        throw new ValidationError(`Missing required field: "${field}"`);
      }
      if (rule.default !== undefined) {
        output[field] = rule.default;
      }
      continue;
    }

    const value = input[field];
    const actualType = Array.isArray(value) ? "array" : typeof value;

    if (actualType !== rule.type) {
      throw new ValidationError(
        `Field "${field}" must be of type ${rule.type}, got ${actualType}`
      );
    }

    if (rule.validate && !rule.validate(value)) {
      throw new ValidationError(
        rule.message ?? `Field "${field}" failed validation`
      );
    }

    output[field] = value;
  }

  // Reject unknown fields — fail closed rather than silently ignoring
  // args the caller (e.g. the AI planner) sent by mistake.
  for (const key of Object.keys(input)) {
    if (!(key in schema)) {
      throw new ValidationError(`Unknown field: "${key}"`);
    }
  }

  return output;
}
