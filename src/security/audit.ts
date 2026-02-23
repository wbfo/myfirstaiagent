import { resolveSandboxConfigForAgent } from "../agents/sandbox.js";
import { execDockerRaw } from "../agents/sandbox/docker.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import { formatCliCommand } from "../cli/command-format.js";
import { resolveConfigPath, resolveStateDir } from "../config/paths.js";
import { type OpenClawConfig } from "../config/types.js";
import { buildGatewayConnectionDetails } from "../gateway/call.js";
import { resolveGatewayProbeAuth } from "../gateway/probe-auth.js";
import { probeGateway } from "../gateway/probe.js";
import { collectChannelSecurityFindings } from "./audit-channel.js";
import {
  collectAttackSurfaceSummaryFindings,
  collectLoggingFindings,
  collectMinimalProfileOverrideFindings,
  collectModelHygieneFindings,
  collectSmallModelRiskFindings,
  collectElevatedFindings,
  collectExecRuntimeFindings,
} from "./audit-config.js";
import {
  collectFilesystemFindings,
  collectSyncedFolderFindings,
  collectSecretsInConfigFindings,
  readConfigSnapshotForAudit,
  collectIncludeFilePermFindings,
  collectStateDeepFilesystemFindings,
} from "./audit-fs-checks.js";
import { collectBrowserControlFindings, collectGatewayConfigFindings } from "./audit-gateway.js";
import {
  collectGatewayHttpNoAuthFindings,
  collectGatewayHttpSessionKeyOverrideFindings,
  collectHooksHardeningFindings,
  collectNodeDenyCommandPatternFindings,
  collectExposureMatrixFindings,
} from "./audit-network.js";
import {
  collectPluginsTrustFindings,
  collectPluginsCodeSafetyFindings,
  collectInstalledSkillsCodeSafetyFindings,
} from "./audit-plugins.js";
import {
  collectSandboxDangerousConfigFindings,
  collectSandboxDockerNoopFindings,
  collectSandboxBrowserHashLabelFindings,
} from "./audit-sandbox-checks.js";
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
        ...(await collectIncludeFilePermFindings({
          snapshot: configSnapshot,
          env,
          platform,
          execIcacls,
        })),
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
