import { resolveSandboxConfigForAgent } from "../agents/sandbox.js";
import { execDockerRaw } from "../agents/sandbox/docker.js";
import {
  collectAttackSurfaceSummaryFindings,
  collectExposureMatrixFindings,
  collectGatewayHttpNoAuthFindings,
  collectGatewayHttpSessionKeyOverrideFindings,
  collectHooksHardeningFindings,
  collectIncludeFilePermFindings,
  collectInstalledSkillsCodeSafetyFindings,
  collectSandboxBrowserHashLabelFindings,
  collectMinimalProfileOverrideFindings,
  collectModelHygieneFindings,
  collectNodeDenyCommandPatternFindings,
  collectSmallModelRiskFindings,
  collectSandboxDangerousConfigFindings,
  collectSandboxDockerNoopFindings,
  collectPluginsTrustFindings,
  collectSecretsInConfigFindings,
  collectPluginsCodeSafetyFindings,
  collectStateDeepFilesystemFindings,
  collectSyncedFolderFindings,
  readConfigSnapshotForAudit,
} from "./audit-extra.js";
import { collectFilesystemFindings } from "./audit-fs-checks.js";
import {
  collectBrowserControlFindings,
  collectGatewayConfigFindings,
} from "./audit-gateway.js";
import type { ExecFn } from "./windows-acl.js";

export type SecurityAuditSeverity = "info" | "warn" | "critical";

export type SecurityAuditFinding = {
  checkId: string;
  severity: SecurityAuditSeverity;
  title: string;
  detail: string;
  remediation?: string;
};

export type SecurityAuditSummary = {
  critical: number;
  warn: number;
  info: number;
};

export type SecurityAuditReport = {
  ts: number;
  summary: SecurityAuditSummary;
  findings: SecurityAuditFinding[];
  deep?: {
    gateway?: {
      attempted: boolean;
      url: string | null;
      ok: boolean;
      error: string | null;
      close?: { code: number; reason: string } | null;
    };
  };
};

export type SecurityAuditOptions = {
  config: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  deep?: boolean;
  includeFilesystem?: boolean;
  includeChannelSecurity?: boolean;
  /** Override where to check state (default: resolveStateDir()). */
  stateDir?: string;
  /** Override config path check (default: resolveConfigPath()). */
  configPath?: string;
  /** Time limit for deep gateway probe. */
  deepTimeoutMs?: number;
  /** Dependency injection for tests. */
  plugins?: ReturnType<typeof listChannelPlugins>;
  /** Dependency injection for tests. */
  probeGatewayFn?: typeof probeGateway;
  /** Dependency injection for tests (Windows ACL checks). */
  execIcacls?: ExecFn;
  /** Dependency injection for tests (Docker label checks). */
  execDockerRawFn?: typeof execDockerRaw;
};

function countBySeverity(findings: SecurityAuditFinding[]): SecurityAuditSummary {
  let critical = 0;
  let warn = 0;
  let info = 0;
  for (const f of findings) {
    if (f.severity === "critical") {
      critical += 1;
    } else if (f.severity === "warn") {
      warn += 1;
    } else {
      info += 1;
    }
  }
  return { critical, warn, info };
}

function normalizeAllowFromList(list: Array<string | number> | undefined | null): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((v) => String(v).trim()).filter(Boolean);
}


function collectLoggingFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const redact = cfg.logging?.redactSensitive;
  if (redact !== "off") {
    return [];
  }
  return [
    {
      checkId: "logging.redact_off",
      severity: "warn",
      title: "Tool summary redaction is disabled",
      detail: `logging.redactSensitive="off" can leak secrets into logs and status output.`,
      remediation: `Set logging.redactSensitive="tools".`,
    },
  ];
}

function collectElevatedFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const enabled = cfg.tools?.elevated?.enabled;
  const allowFrom = cfg.tools?.elevated?.allowFrom ?? {};
  const anyAllowFromKeys = Object.keys(allowFrom).length > 0;

  if (enabled === false) {
    return findings;
  }
  if (!anyAllowFromKeys) {
    return findings;
  }

  for (const [provider, list] of Object.entries(allowFrom)) {
    const normalized = normalizeAllowFromList(list);
    if (normalized.includes("*")) {
      findings.push({
        checkId: `tools.elevated.allowFrom.${provider}.wildcard`,
        severity: "critical",
        title: "Elevated exec allowlist contains wildcard",
        detail: `tools.elevated.allowFrom.${provider} includes "*" which effectively approves everyone on that channel for elevated mode.`,
      });
    } else if (normalized.length > 25) {
      findings.push({
        checkId: `tools.elevated.allowFrom.${provider}.large`,
        severity: "warn",
        title: "Elevated exec allowlist is large",
        detail: `tools.elevated.allowFrom.${provider} has ${normalized.length} entries; consider tightening elevated access.`,
      });
    }
  }

  return findings;
}

function collectExecRuntimeFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const globalExecHost = cfg.tools?.exec?.host;
  const defaultSandboxMode = resolveSandboxConfigForAgent(cfg).mode;
  const defaultHostIsExplicitSandbox = globalExecHost === "sandbox";

  if (defaultHostIsExplicitSandbox && defaultSandboxMode === "off") {
    findings.push({
      checkId: "tools.exec.host_sandbox_no_sandbox_defaults",
      severity: "warn",
      title: "Exec host is sandbox but sandbox mode is off",
      detail:
        "tools.exec.host is explicitly set to sandbox while agents.defaults.sandbox.mode=off. " +
        "In this mode, exec runs directly on the gateway host.",
      remediation:
        'Enable sandbox mode (`agents.defaults.sandbox.mode="non-main"` or `"all"`) or set tools.exec.host to "gateway" with approvals.',
    });
  }

  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const riskyAgents = agents
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        entry.tools?.exec?.host === "sandbox" &&
        resolveSandboxConfigForAgent(cfg, entry.id).mode === "off",
    )
    .map((entry) => entry.id)
    .slice(0, 5);

  if (riskyAgents.length > 0) {
    findings.push({
      checkId: "tools.exec.host_sandbox_no_sandbox_agents",
      severity: "warn",
      title: "Agent exec host uses sandbox while sandbox mode is off",
      detail:
        `agents.list.*.tools.exec.host is set to sandbox for: ${riskyAgents.join(", ")}. ` +
        "With sandbox mode off, exec runs directly on the gateway host.",
      remediation:
        'Enable sandbox mode for these agents (`agents.list[].sandbox.mode`) or set their tools.exec.host to "gateway".',
    });
  }

  return findings;
}

async function maybeProbeGateway(params: {
  cfg: OpenClawConfig;
  timeoutMs: number;
  probe: typeof probeGateway;
}): Promise<SecurityAuditReport["deep"]> {
  const connection = buildGatewayConnectionDetails({ config: params.cfg });
  const url = connection.url;
  const isRemoteMode = params.cfg.gateway?.mode === "remote";
  const remoteUrlRaw =
    typeof params.cfg.gateway?.remote?.url === "string" ? params.cfg.gateway.remote.url.trim() : "";
  const remoteUrlMissing = isRemoteMode && !remoteUrlRaw;

  const auth =
    !isRemoteMode || remoteUrlMissing
      ? resolveGatewayProbeAuth({ cfg: params.cfg, mode: "local" })
      : resolveGatewayProbeAuth({ cfg: params.cfg, mode: "remote" });
  const res = await params.probe({ url, auth, timeoutMs: params.timeoutMs }).catch((err) => ({
    ok: false,
    url,
    connectLatencyMs: null,
    error: String(err),
    close: null,
    health: null,
    status: null,
    presence: null,
    configSnapshot: null,
  }));

  return {
    gateway: {
      attempted: true,
      url,
      ok: res.ok,
      error: res.ok ? null : res.error,
      close: res.close ? { code: res.close.code, reason: res.close.reason } : null,
    },
  };
}

export async function runSecurityAudit(opts: SecurityAuditOptions): Promise<SecurityAuditReport> {
  const findings: SecurityAuditFinding[] = [];
  const cfg = opts.config;
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const execIcacls = opts.execIcacls;
  const stateDir = opts.stateDir ?? resolveStateDir(env);
  const configPath = opts.configPath ?? resolveConfigPath(env, stateDir);

  findings.push(...collectAttackSurfaceSummaryFindings(cfg));
  findings.push(...collectSyncedFolderFindings({ stateDir, configPath }));

  findings.push(...collectGatewayConfigFindings(cfg, env));
  findings.push(...collectBrowserControlFindings(cfg, env));
  findings.push(...collectLoggingFindings(cfg));
  findings.push(...collectElevatedFindings(cfg));
  findings.push(...collectExecRuntimeFindings(cfg));
  findings.push(...collectHooksHardeningFindings(cfg, env));
  findings.push(...collectGatewayHttpNoAuthFindings(cfg, env));
  findings.push(...collectGatewayHttpSessionKeyOverrideFindings(cfg));
  findings.push(...collectSandboxDockerNoopFindings(cfg));
  findings.push(...collectSandboxDangerousConfigFindings(cfg));
  findings.push(...collectNodeDenyCommandPatternFindings(cfg));
  findings.push(...collectMinimalProfileOverrideFindings(cfg));
  findings.push(...collectSecretsInConfigFindings(cfg));
  findings.push(...collectModelHygieneFindings(cfg));
  findings.push(...collectSmallModelRiskFindings({ cfg, env }));
  findings.push(...collectExposureMatrixFindings(cfg));

  const configSnapshot =
    opts.includeFilesystem !== false
      ? await readConfigSnapshotForAudit({ env, configPath }).catch(() => null)
      : null;

  if (opts.includeFilesystem !== false) {
    findings.push(
      ...(await collectFilesystemFindings({
        stateDir,
        configPath,
        env,
        platform,
        execIcacls,
      })),
    );
    if (configSnapshot) {
      findings.push(
        ...(await collectIncludeFilePermFindings({ configSnapshot, env, platform, execIcacls })),
      );
    }
    findings.push(
      ...(await collectStateDeepFilesystemFindings({ cfg, env, stateDir, platform, execIcacls })),
    );
    findings.push(
      ...(await collectSandboxBrowserHashLabelFindings({
        execDockerRawFn: opts.execDockerRawFn,
      })),
    );
    findings.push(...(await collectPluginsTrustFindings({ cfg, stateDir })));
    if (opts.deep === true) {
      findings.push(...(await collectPluginsCodeSafetyFindings({ stateDir })));
      findings.push(...(await collectInstalledSkillsCodeSafetyFindings({ cfg, stateDir })));
    }
  }

  if (opts.includeChannelSecurity !== false) {
    const plugins = opts.plugins ?? listChannelPlugins();
    findings.push(...(await collectChannelSecurityFindings({ cfg, plugins })));
  }

  const deep =
    opts.deep === true
      ? await maybeProbeGateway({
        cfg,
        timeoutMs: Math.max(250, opts.deepTimeoutMs ?? 5000),
        probe: opts.probeGatewayFn ?? probeGateway,
      })
      : undefined;

  if (deep?.gateway?.attempted && !deep.gateway.ok) {
    findings.push({
      checkId: "gateway.probe_failed",
      severity: "warn",
      title: "Gateway probe failed (deep)",
      detail: deep.gateway.error ?? "gateway unreachable",
      remediation: `Run "${formatCliCommand("openclaw status --all")}" to debug connectivity/auth, then re-run "${formatCliCommand("openclaw security audit --deep")}".`,
    });
  }

  const summary = countBySeverity(findings);
  return { ts: Date.now(), summary, findings, deep };
}
