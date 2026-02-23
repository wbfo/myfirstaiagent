/**
 * X AuditIQ — Public API Surface
 *
 * Usage:
 *   import { safeParseIntakeBrief, runScoringEngine, formatFullReport, formatSnippet } from "./audit-iq/index.js";
 */

export { parseIntakeBrief, safeParseIntakeBrief } from "./intake/parser.js";
export { AuditBriefSchema } from "./intake/schema.js";
export { runScoringEngine } from "./scoring/engine.js";
export { formatFullReport, formatSnippet } from "./report/formatter.js";
export type {
  AuditBrief,
  AuditDimension,
  AuditFinding,
  AuditReport,
  AuditSeverity,
  AuditSnippet,
  DimensionScore,
} from "./types.js";
