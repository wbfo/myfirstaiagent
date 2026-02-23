import type { OpenClawConfig } from "../config/config.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import { resolveNodeCommandAllowlist } from "../gateway/node-command-policy.js";
import type { SecurityAuditFinding } from "./audit.js";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function listGroupPolicyOpen(cfg: OpenClawConfig): string[] {
  const out: string[] = [];
  const channels = cfg.channels as Record<string, unknown> | undefined;
  if (!channels || typeof channels !== "object") {
    return out;
  }
  for (const [channelId, value] of Object.entries(channels)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const section = value as Record<string, unknown>;
    if (section.groupPolicy === "open") {
      out.push(`channels.${channelId}.groupPolicy`);
    }
    const accounts = section.accounts;
    if (accounts && typeof accounts === "object") {
      for (const [accountId, accountVal] of Object.entries(accounts)) {
        if (!accountVal || typeof accountVal !== "object") {
          continue;
        }
        const acc = accountVal as Record<string, unknown>;
        if (acc.groupPolicy === "open") {
          out.push(`channels.${channelId}.accounts.${accountId}.groupPolicy`);
        }
      }
    }
  }
  return out;
}

function isGatewayRemotelyExposed(cfg: OpenClawConfig): boolean {
  const bind = typeof cfg.gateway?.bind === "string" ? cfg.gateway.bind : "loopback";
  if (bind !== "loopback") {
    return true;
  }
  const tailscaleMode = cfg.gateway?.tailscale?.mode ?? "off";
  return tailscaleMode === "serve" || tailscaleMode === "funnel";
}

function normalizeNodeCommand(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function listKnownNodeCommands(cfg: OpenClawConfig): Set<string> {
  const baseCfg: OpenClawConfig = {
    ...cfg,
    gateway: {
      ...cfg.gateway,
      nodes: {
        ...cfg.gateway?.nodes,
        denyCommands: [],
      },
    },
  };
  const out = new Set<string>();
  for (const platform of ["ios", "android", "macos", "linux", "windows", "unknown"]) {
    const allow = resolveNodeCommandAllowlist(baseCfg, { platform });
    for (const cmd of allow) {
      const normalized = normalizeNodeCommand(cmd);
      if (normalized) {
        out.add(normalized);
      }
    }
  }
  return out;
}

function looksLikeNodeCommandPattern(value: string): boolean {
  if (!value) {
    return false;
  }
  if (/[?*[\]{}(),|]/.test(value)) {
    return true;
  }
  if (
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.startsWith("^") ||
    value.endsWith("$")
  ) {
    return true;
  }
  return /\s/.test(value) || value.includes("group:");
}

// --------------------------------------------------------------------------
// Exported collectors
// --------------------------------------------------------------------------

export function collectExposureMatrixFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const openGroups = listGroupPolicyOpen(cfg);
  if (openGroups.length === 0) {
    return findings;
  }

  const elevatedEnabled = cfg.tools?.elevated?.enabled !== false;
  if (elevatedEnabled) {
    findings.push({
      checkId: "security.exposure.open_groups_with_elevated",
      severity: "critical",
      title: "Open groupPolicy with elevated tools enabled",
      detail:
        `Found groupPolicy="open" at:\n${openGroups.map((p) => `- ${p}`).join("\n")}\n` +
        "With tools.elevated enabled, a prompt injection in those rooms can become a high-impact incident.",
      remediation: `Set groupPolicy="allowlist" and keep elevated allowlists extremely tight.`,
    });
  }

  return findings;
}

export function collectGatewayHttpNoAuthFindings(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const tailscaleMode = cfg.gateway?.tailscale?.mode ?? "off";
  const auth = resolveGatewayAuth({ authConfig: cfg.gateway?.auth, tailscaleMode, env });
  if (auth.mode !== "none") {
    return findings;
  }

  const chatCompletionsEnabled = cfg.gateway?.http?.endpoints?.chatCompletions?.enabled === true;
  const responsesEnabled = cfg.gateway?.http?.endpoints?.responses?.enabled === true;
  const enabledEndpoints = [
    "/tools/invoke",
    chatCompletionsEnabled ? "/v1/chat/completions" : null,
    responsesEnabled ? "/v1/responses" : null,
  ].filter((entry): entry is string => Boolean(entry));

  const remoteExposure = isGatewayRemotelyExposed(cfg);
  findings.push({
    checkId: "gateway.http.no_auth",
    severity: remoteExposure ? "critical" : "warn",
    title: "Gateway HTTP APIs are reachable without auth",
    detail:
      `gateway.auth.mode="none" leaves ${enabledEndpoints.join(", ")} callable without a shared secret. ` +
      "Treat this as trusted-local only and avoid exposing the gateway beyond loopback.",
    remediation:
      "Set gateway.auth.mode to token/password (recommended). If you intentionally keep mode=none, keep gateway.bind=loopback and disable optional HTTP endpoints.",
  });

  return findings;
}

export function collectGatewayHttpSessionKeyOverrideFindings(
  cfg: OpenClawConfig,
): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const chatCompletionsEnabled = cfg.gateway?.http?.endpoints?.chatCompletions?.enabled === true;
  const responsesEnabled = cfg.gateway?.http?.endpoints?.responses?.enabled === true;
  if (!chatCompletionsEnabled && !responsesEnabled) {
    return findings;
  }

  const enabledEndpoints = [
    chatCompletionsEnabled ? "/v1/chat/completions" : null,
    responsesEnabled ? "/v1/responses" : null,
  ].filter((entry): entry is string => Boolean(entry));

  findings.push({
    checkId: "gateway.http.session_key_override_enabled",
    severity: "info",
    title: "HTTP API session-key override is enabled",
    detail:
      `${enabledEndpoints.join(", ")} accept x-openclaw-session-key for per-request session routing. ` +
      "Treat API credential holders as trusted principals.",
  });

  return findings;
}

export function collectHooksHardeningFindings(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  if (cfg.hooks?.enabled !== true) {
    return findings;
  }

  const token = typeof cfg.hooks?.token === "string" ? cfg.hooks.token.trim() : "";
  if (token && token.length < 24) {
    findings.push({
      checkId: "hooks.token_too_short",
      severity: "warn",
      title: "Hooks token looks short",
      detail: `hooks.token is ${token.length} chars; prefer a long random token.`,
    });
  }

  const gatewayAuth = resolveGatewayAuth({
    authConfig: cfg.gateway?.auth,
    tailscaleMode: cfg.gateway?.tailscale?.mode ?? "off",
    env,
  });
  const openclawGatewayToken =
    typeof env.OPENCLAW_GATEWAY_TOKEN === "string" && env.OPENCLAW_GATEWAY_TOKEN.trim()
      ? env.OPENCLAW_GATEWAY_TOKEN.trim()
      : null;
  const gatewayToken =
    gatewayAuth.mode === "token" &&
    typeof gatewayAuth.token === "string" &&
    gatewayAuth.token.trim()
      ? gatewayAuth.token.trim()
      : openclawGatewayToken
        ? openclawGatewayToken
        : null;
  if (token && gatewayToken && token === gatewayToken) {
    findings.push({
      checkId: "hooks.token_reuse_gateway_token",
      severity: "critical",
      title: "Hooks token reuses the Gateway token",
      detail:
        "hooks.token matches gateway.auth token; compromise of hooks expands blast radius to the Gateway API.",
      remediation: "Use a separate hooks.token dedicated to hook ingress.",
    });
  }

  const rawPath = typeof cfg.hooks?.path === "string" ? cfg.hooks.path.trim() : "";
  if (rawPath === "/") {
    findings.push({
      checkId: "hooks.path_root",
      severity: "critical",
      title: "Hooks base path is '/'",
      detail: "hooks.path='/' would shadow other HTTP endpoints and is unsafe.",
      remediation: "Use a dedicated path like '/hooks'.",
    });
  }

  const allowRequestSessionKey = cfg.hooks?.allowRequestSessionKey === true;
  const defaultSessionKey =
    typeof cfg.hooks?.defaultSessionKey === "string" ? cfg.hooks.defaultSessionKey.trim() : "";
  const allowedPrefixes = Array.isArray(cfg.hooks?.allowedSessionKeyPrefixes)
    ? (cfg.hooks.allowedSessionKeyPrefixes)
        .map((prefix) => prefix.trim())
        .filter((prefix) => prefix.length > 0)
    : [];
  const remoteExposure = isGatewayRemotelyExposed(cfg);

  if (!defaultSessionKey) {
    findings.push({
      checkId: "hooks.default_session_key_unset",
      severity: "warn",
      title: "hooks.defaultSessionKey is not configured",
      detail:
        "Hook agent runs without explicit sessionKey use generated per-request keys. Set hooks.defaultSessionKey to keep hook ingress scoped to a known session.",
      remediation: 'Set hooks.defaultSessionKey (for example, "hook:ingress").',
    });
  }

  if (allowRequestSessionKey) {
    findings.push({
      checkId: "hooks.request_session_key_enabled",
      severity: remoteExposure ? "critical" : "warn",
      title: "External hook payloads may override sessionKey",
      detail:
        "hooks.allowRequestSessionKey=true allows `/hooks/agent` callers to choose the session key. Treat hook token holders as full-trust unless you also restrict prefixes.",
      remediation:
        "Set hooks.allowRequestSessionKey=false (recommended) or constrain hooks.allowedSessionKeyPrefixes.",
    });
  }

  if (allowRequestSessionKey && allowedPrefixes.length === 0) {
    findings.push({
      checkId: "hooks.request_session_key_prefixes_missing",
      severity: remoteExposure ? "critical" : "warn",
      title: "Request sessionKey override is enabled without prefix restrictions",
      detail:
        "hooks.allowRequestSessionKey=true and hooks.allowedSessionKeyPrefixes is unset/empty, so request payloads can target arbitrary session key shapes.",
      remediation:
        'Set hooks.allowedSessionKeyPrefixes (for example, ["hook:"]) or disable request overrides.',
    });
  }

  return findings;
}

export function collectNodeDenyCommandPatternFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const denyListRaw = cfg.gateway?.nodes?.denyCommands;
  if (!Array.isArray(denyListRaw) || denyListRaw.length === 0) {
    return findings;
  }

  const denyList = (denyListRaw).map(normalizeNodeCommand).filter(Boolean);
  if (denyList.length === 0) {
    return findings;
  }

  const knownCommands = listKnownNodeCommands(cfg);
  const patternLike = denyList.filter((entry) => looksLikeNodeCommandPattern(entry));
  const unknownExact = denyList.filter(
    (entry) => !looksLikeNodeCommandPattern(entry) && !knownCommands.has(entry),
  );
  if (patternLike.length === 0 && unknownExact.length === 0) {
    return findings;
  }

  const detailParts: string[] = [];
  if (patternLike.length > 0) {
    detailParts.push(
      `Pattern-like entries (not supported by exact matching): ${patternLike.join(", ")}`,
    );
  }
  if (unknownExact.length > 0) {
    detailParts.push(
      `Unknown command names (not in defaults/allowCommands): ${unknownExact.join(", ")}`,
    );
  }
  const examples = Array.from(knownCommands).slice(0, 8);

  findings.push({
    checkId: "gateway.nodes.deny_commands_ineffective",
    severity: "warn",
    title: "Some gateway.nodes.denyCommands entries are ineffective",
    detail:
      "gateway.nodes.denyCommands uses exact command-name matching only.\n" +
      detailParts.map((entry) => `- ${entry}`).join("\n"),
    remediation:
      `Use exact command names (for example: ${examples.join(", ")}). ` +
      "If you need broader restrictions, remove risky commands from allowCommands/default workflows.",
  });

  return findings;
}
