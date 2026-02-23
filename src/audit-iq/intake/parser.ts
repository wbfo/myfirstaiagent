import type { AuditBrief } from "../types.js";
import { AuditBriefSchema, type AuditBriefInput } from "./schema.js";

/**
 * Parse and validate raw intake form data into a typed AuditBrief.
 * Throws a ZodError if the input is invalid.
 */
export function parseIntakeBrief(raw: unknown): AuditBrief {
  const parsed = AuditBriefSchema.parse(raw) as AuditBriefInput;
  return parsed as AuditBrief;
}

/**
 * Safe version — returns null and surfaces a readable error message instead of throwing.
 */
export function safeParseIntakeBrief(
  raw: unknown,
): { ok: true; brief: AuditBrief } | { ok: false; error: string } {
  const result = AuditBriefSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, error: issues };
  }
  return { ok: true, brief: result.data as AuditBrief };
}
