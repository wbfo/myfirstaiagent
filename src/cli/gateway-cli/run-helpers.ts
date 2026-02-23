import type { Command } from "commander";
import {
  listAgentIds,
  resolveAgentSkillsFilter,
  resolveAgentWorkspaceDir,
} from "../../agents/agent-scope.js";
import { filterWorkspaceSkillEntries, loadWorkspaceSkillEntries } from "../../agents/skills.js";
import { loadConfig } from "../../config/config.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { inheritOptionFromParent } from "../command-options.js";

export type GatewayRunOpts = {
  port?: unknown;
  bind?: unknown;
  token?: unknown;
  auth?: unknown;
  password?: unknown;
  tailscale?: unknown;
  tailscaleResetOnExit?: boolean;
  allowUnconfigured?: boolean;
  force?: boolean;
  verbose?: boolean;
  claudeCliLogs?: boolean;
  wsLog?: unknown;
  compact?: boolean;
  rawStream?: boolean;
  rawStreamPath?: unknown;
  dev?: boolean;
  reset?: boolean;
};

const gatewayLog = createSubsystemLogger("gateway");

const GATEWAY_RUN_VALUE_KEYS = [
  "port",
  "bind",
  "token",
  "auth",
  "password",
  "tailscale",
  "wsLog",
  "rawStreamPath",
] as const;

const GATEWAY_RUN_BOOLEAN_KEYS = [
  "tailscaleResetOnExit",
  "allowUnconfigured",
  "dev",
  "reset",
  "force",
  "verbose",
  "claudeCliLogs",
  "compact",
  "rawStream",
] as const;

export function runSkillsPreflight(cfg: ReturnType<typeof loadConfig>): void {
  try {
    const agentIds = listAgentIds(cfg);
    const discovered = new Set<string>();
    for (const agentId of agentIds) {
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
      const entries = loadWorkspaceSkillEntries(workspaceDir, { config: cfg });
      const eligible = filterWorkspaceSkillEntries(entries, cfg);
      const agentFilter = resolveAgentSkillsFilter(cfg, agentId);
      const scoped =
        agentFilter && agentFilter.length > 0
          ? eligible.filter((entry) => agentFilter.includes(entry.skill.name))
          : eligible;
      for (const entry of scoped) {
        discovered.add(entry.skill.name);
      }
      gatewayLog.info(
        `[skills-preflight] agent=${agentId} workspace=${workspaceDir} loaded=${scoped.length}`,
      );
    }
    if (discovered.size === 0) {
      gatewayLog.warn(
        "[skills-preflight] no eligible skills discovered before startup; bot will run without skill context.",
      );
      return;
    }
    const preview = Array.from(discovered).sort().slice(0, 12).join(", ");
    gatewayLog.info(
      `[skills-preflight] discovered=${discovered.size} unique skills before startup${preview ? ` (${preview})` : ""}`,
    );
  } catch (error) {
    gatewayLog.warn(`[skills-preflight] failed: ${String(error)}`);
  }
}

export function resolveGatewayRunOptions(opts: GatewayRunOpts, command?: Command): GatewayRunOpts {
  const resolved: GatewayRunOpts = { ...opts };

  for (const key of GATEWAY_RUN_VALUE_KEYS) {
    const inherited = inheritOptionFromParent(command, key);
    if (key === "wsLog") {
      // wsLog has a child default ("auto"), so prefer inherited parent CLI value when present.
      resolved[key] = inherited ?? resolved[key];
      continue;
    }
    resolved[key] = resolved[key] ?? inherited;
  }

  for (const key of GATEWAY_RUN_BOOLEAN_KEYS) {
    const inherited = inheritOptionFromParent<boolean>(command, key);
    resolved[key] = Boolean(resolved[key] || inherited);
  }

  return resolved;
}
