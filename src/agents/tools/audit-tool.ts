import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "@sinclair/typebox";
import type { OpenClawConfig } from "../../config/config.js";
import { getMemorySearchManager } from "../../memory/index.js";
import { resolveSessionAgentId } from "../agent-scope.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";

const execAsync = promisify(exec);

const CodeAuditSchema = Type.Object({
  scope: Type.String({
    description: "File path, directory, or feature name to audit.",
  }),
});

/**
 * Creates a tool that gathers structural and historical context for a code audit.
 */
export function createCodeAuditTool(options: {
  config?: OpenClawConfig;
  agentSessionKey?: string;
  workspaceDir?: string;
}): AnyAgentTool | null {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }

  const agentId = resolveSessionAgentId({
    sessionKey: options.agentSessionKey,
    config: cfg,
  });

  return {
    label: "Code Audit",
    name: "code_audit",
    description:
      "Collects structural metrics, Git history, and QMD context for a code audit. Returns churn rate, related modules, and potential architectural drift indicators.",
    parameters: CodeAuditSchema,
    execute: async (_toolCallId, params) => {
      const scope = readStringParam(params, "scope", { required: true });
      const workspaceDir = options.workspaceDir ?? process.cwd();

      // 1. Git Metrics (Churn & Recency)
      let gitStats = { churn: 0, lastModified: "unknown" };
      try {
        // Count commits touching this scope
        const { stdout: churnStdout } = await execAsync(
          `git log --format=format: --name-only -- "${scope}" | grep . | wc -l`,
          { cwd: workspaceDir },
        );
        gitStats.churn = Number.parseInt(churnStdout.trim(), 10) || 0;

        // Get last modified date
        const { stdout: dateStdout } = await execAsync(`git log -1 --format=%cd -- "${scope}"`, {
          cwd: workspaceDir,
        });
        gitStats.lastModified = dateStdout.trim() || "unknown";
      } catch (err) {
        // Fallback for non-git environments or missing files
        gitStats.lastModified = "n/a (git error)";
      }

      // 2. QMD Context (Similar architectural patterns)
      let relatedPatterns: Array<{ path: string; snippet: string }> = [];
      try {
        const { manager } = await getMemorySearchManager({
          cfg,
          agentId,
        });
        if (manager) {
          const results = await manager.search(`architectural patterns related to ${scope}`, {
            maxResults: 3,
            sessionKey: options.agentSessionKey,
          });
          relatedPatterns = results.map((r) => ({
            path: r.path,
            snippet: r.snippet,
          }));
        }
      } catch (err) {
        // QMD might be disabled or fail
      }

      return jsonResult({
        scope,
        gitStats,
        relatedPatterns,
        auditTip:
          "High churn (>10) often indicates a need for refactoring. Compare relatedPatterns to ensure consistency.",
      });
    },
  };
}
