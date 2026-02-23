import { resolveBrowserConfig, resolveProfile } from "../browser/config.js";
import { resolveBrowserControlAuth } from "../browser/control-auth.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveConfigPath } from "../config/paths.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import type { SecurityAuditFinding } from "./audit.js";
import { DEFAULT_GATEWAY_HTTP_TOOL_DENY } from "./dangerous-tools.js";

function collectEnabledInsecureOrDangerousFlags(cfg: OpenClawConfig): string[] {
  const enabledFlags: string[] = [];
  if (cfg.gateway?.controlUi?.allowInsecureAuth === true) {
    enabledFlags.push("gateway.controlUi.allowInsecureAuth=true");
  }
  if (cfg.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true) {
    enabledFlags.push("gateway.controlUi.dangerouslyDisableDeviceAuth=true");
  }
  if (cfg.hooks?.gmail?.allowUnsafeExternalContent === true) {
    enabledFlags.push("hooks.gmail.allowUnsafeExternalContent=true");
  }
  if (Array.isArray(cfg.hooks?.mappings)) {
    for (const [index, mapping] of cfg.hooks.mappings.entries()) {
      if (mapping?.allowUnsafeExternalContent === true) {
        enabledFlags.push(`hooks.mappings[${index}].allowUnsafeExternalContent=true`);
      }
    }
  }
  if (cfg.tools?.exec?.applyPatch?.workspaceOnly === false) {
    enabledFlags.push("tools.exec.applyPatch.workspaceOnly=false");
  }
  return enabledFlags;
}

export function collectGatewayConfigFindings(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];

  const bind = typeof cfg.gateway?.bind === "string" ? cfg.gateway.bind : "loopback";
  const tailscaleMode = cfg.gateway?.tailscale?.mode ?? "off";
  const auth = resolveGatewayAuth({ authConfig: cfg.gateway?.auth, tailscaleMode, env });
  const controlUiEnabled = cfg.gateway?.controlUi?.enabled !== false;
  const trustedProxies = Array.isArray(cfg.gateway?.trustedProxies)
    ? cfg.gateway.trustedProxies
    : [];
  const hasToken = typeof auth.token === "string" && auth.token.trim().length > 0;
  const hasPassword = typeof auth.password === "string" && auth.password.trim().length > 0;
  const hasSharedSecret =
    (auth.mode === "token" && hasToken) || (auth.mode === "password" && hasPassword);
  const hasTailscaleAuth = auth.allowTailscale && tailscaleMode === "serve";
  const hasGatewayAuth = hasSharedSecret || hasTailscaleAuth;

  // HTTP /tools/invoke is intended for narrow automation, not session orchestration/admin operations.
  // If operators opt-in to re-enabling these tools over HTTP, warn loudly so the choice is explicit.
  const gatewayToolsAllowRaw = Array.isArray(cfg.gateway?.tools?.allow)
    ? cfg.gateway?.tools?.allow
    : [];
  const gatewayToolsAllow = new Set(
    gatewayToolsAllowRaw
      .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
      .filter(Boolean),
  );
  const reenabledOverHttp = DEFAULT_GATEWAY_HTTP_TOOL_DENY.filter((name) =>
    gatewayToolsAllow.has(name),
  );
  if (reenabledOverHttp.length > 0) {
    const extraRisk = bind !== "loopback" || tailscaleMode === "funnel";
    findings.push({
      checkId: "gateway.tools_invoke_http.dangerous_allow",
      severity: extraRisk ? "critical" : "warn",
      title: "Gateway HTTP /tools/invoke re-enables dangerous tools",
      detail:
        `gateway.tools.allow includes ${reenabledOverHttp.join(", ")} which removes them from the default HTTP deny list. ` +
        "This can allow remote session spawning / control-plane actions via HTTP and increases RCE blast radius if the gateway is reachable.",
      remediation:
        "Remove these entries from gateway.tools.allow (recommended). " +
        "If you keep them enabled, keep gateway.bind loopback-only (or tailnet-only), restrict network exposure, and treat the gateway token/password as full-admin.",
    });
  }
  if (bind !== "loopback" && !hasSharedSecret && auth.mode !== "trusted-proxy") {
    findings.push({
      checkId: "gateway.bind_no_auth",
      severity: "critical",
      title: "Gateway binds beyond loopback without auth",
      detail: `gateway.bind="${bind}" but no gateway.auth token/password is configured.`,
      remediation: `Set gateway.auth (token recommended) or bind to loopback.`,
    });
  }

  if (bind === "loopback" && controlUiEnabled && trustedProxies.length === 0) {
    findings.push({
      checkId: "gateway.trusted_proxies_missing",
      severity: "warn",
      title: "Reverse proxy headers are not trusted",
      detail:
        "gateway.bind is loopback and gateway.trustedProxies is empty. " +
        "If you expose the Control UI through a reverse proxy, configure trusted proxies " +
        "so local-client checks cannot be spoofed.",
      remediation:
        "Set gateway.trustedProxies to your proxy IPs or keep the Control UI local-only.",
    });
  }

  if (bind === "loopback" && controlUiEnabled && !hasGatewayAuth) {
    findings.push({
      checkId: "gateway.loopback_no_auth",
      severity: "critical",
      title: "Gateway auth missing on loopback",
      detail:
        "gateway.bind is loopback but no gateway auth secret is configured. " +
        "If the Control UI is exposed through a reverse proxy, unauthenticated access is possible.",
      remediation: "Set gateway.auth (token recommended) or keep the Control UI local-only.",
    });
  }

  if (tailscaleMode === "funnel") {
    findings.push({
      checkId: "gateway.tailscale_funnel",
      severity: "critical",
      title: "Tailscale Funnel exposure enabled",
      detail: `gateway.tailscale.mode="funnel" exposes the Gateway publicly; keep auth strict and treat it as internet-facing.`,
      remediation: `Prefer tailscale.mode="serve" (tailnet-only) or set tailscale.mode="off".`,
    });
  } else if (tailscaleMode === "serve") {
    findings.push({
      checkId: "gateway.tailscale_serve",
      severity: "info",
      title: "Tailscale Serve exposure enabled",
      detail: `gateway.tailscale.mode="serve" exposes the Gateway to your tailnet (loopback behind Tailscale).`,
    });
  }

  if (cfg.gateway?.controlUi?.allowInsecureAuth === true) {
    findings.push({
      checkId: "gateway.control_ui.insecure_auth",
      severity: "warn",
      title: "Control UI insecure auth toggle enabled",
      detail:
        "gateway.controlUi.allowInsecureAuth=true does not bypass secure context or device identity checks; only dangerouslyDisableDeviceAuth disables Control UI device identity checks.",
      remediation: "Disable it or switch to HTTPS (Tailscale Serve) or localhost.",
    });
  }

  if (cfg.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true) {
    findings.push({
      checkId: "gateway.control_ui.device_auth_disabled",
      severity: "critical",
      title: "DANGEROUS: Control UI device auth disabled",
      detail:
        "gateway.controlUi.dangerouslyDisableDeviceAuth=true disables device identity checks for the Control UI.",
      remediation: "Disable it unless you are in a short-lived break-glass scenario.",
    });
  }

  const enabledDangerousFlags = collectEnabledInsecureOrDangerousFlags(cfg);
  if (enabledDangerousFlags.length > 0) {
    findings.push({
      checkId: "config.insecure_or_dangerous_flags",
      severity: "warn",
      title: "Insecure or dangerous config flags enabled",
      detail: `Detected ${enabledDangerousFlags.length} enabled flag(s): ${enabledDangerousFlags.join(", ")}.`,
      remediation:
        "Disable these flags when not actively debugging, or keep deployment scoped to trusted/local-only networks.",
    });
  }

  const token =
    typeof auth.token === "string" && auth.token.trim().length > 0 ? auth.token.trim() : null;
  if (auth.mode === "token" && token && token.length < 24) {
    findings.push({
      checkId: "gateway.token_too_short",
      severity: "warn",
      title: "Gateway token looks short",
      detail: `gateway auth token is ${token.length} chars; prefer a long random token.`,
    });
  }

  if (auth.mode === "trusted-proxy") {
    const trustedProxies = cfg.gateway?.trustedProxies ?? [];
    const trustedProxyConfig = cfg.gateway?.auth?.trustedProxy;

    findings.push({
      checkId: "gateway.trusted_proxy_auth",
      severity: "critical",
      title: "Trusted-proxy auth mode enabled",
      detail:
        'gateway.auth.mode="trusted-proxy" delegates authentication to a reverse proxy. ' +
        "Ensure your proxy (Pomerium, Caddy, nginx) handles auth correctly and that gateway.trustedProxies " +
        "only contains IPs of your actual proxy servers.",
      remediation:
        "Verify: (1) Your proxy terminates TLS and authenticates users. " +
        "(2) gateway.trustedProxies is restricted to proxy IPs only. " +
        "(3) Direct access to the Gateway port is blocked by firewall. " +
        "See /gateway/trusted-proxy-auth for setup guidance.",
    });

    if (trustedProxies.length === 0) {
      findings.push({
        checkId: "gateway.trusted_proxy_no_proxies",
        severity: "critical",
        title: "Trusted-proxy auth enabled but no trusted proxies configured",
        detail:
          'gateway.auth.mode="trusted-proxy" but gateway.trustedProxies is empty. ' +
          "All requests will be rejected.",
        remediation: "Set gateway.trustedProxies to the IP(s) of your reverse proxy.",
      });
    }

    if (!trustedProxyConfig?.userHeader) {
      findings.push({
        checkId: "gateway.trusted_proxy_no_user_header",
        severity: "critical",
        title: "Trusted-proxy auth missing userHeader config",
        detail:
          'gateway.auth.mode="trusted-proxy" but gateway.auth.trustedProxy.userHeader is not configured.',
        remediation:
          "Set gateway.auth.trustedProxy.userHeader to the header name your proxy uses " +
          '(e.g., "x-forwarded-user", "x-pomerium-claim-email").',
      });
    }

    const allowUsers = trustedProxyConfig?.allowUsers ?? [];
    if (allowUsers.length === 0) {
      findings.push({
        checkId: "gateway.trusted_proxy_no_allowlist",
        severity: "warn",
        title: "Trusted-proxy auth allows all authenticated users",
        detail:
          "gateway.auth.trustedProxy.allowUsers is empty, so any user authenticated by your proxy can access the Gateway.",
        remediation:
          "Consider setting gateway.auth.trustedProxy.allowUsers to restrict access to specific users " +
          '(e.g., ["nick@example.com"]).',
      });
    }
  }

  if (bind !== "loopback" && auth.mode !== "trusted-proxy" && !cfg.gateway?.auth?.rateLimit) {
    findings.push({
      checkId: "gateway.auth_no_rate_limit",
      severity: "warn",
      title: "No auth rate limiting configured",
      detail:
        "gateway.bind is not loopback but no gateway.auth.rateLimit is configured. " +
        "Without rate limiting, brute-force auth attacks are not mitigated.",
      remediation:
        "Set gateway.auth.rateLimit (e.g. { maxAttempts: 10, windowMs: 60000, lockoutMs: 300000 }).",
    });
  }

  return findings;
}

export function collectBrowserControlFindings(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];

  let resolved: ReturnType<typeof resolveBrowserConfig>;
  try {
    resolved = resolveBrowserConfig(cfg.browser, cfg);
  } catch (err) {
    findings.push({
      checkId: "browser.control_invalid_config",
      severity: "warn",
      title: "Browser control config looks invalid",
      detail: String(err),
      remediation: `Fix browser.cdpUrl in ${resolveConfigPath()} and re-run "${formatCliCommand("openclaw security audit --deep")}".`,
    });
    return findings;
  }

  if (!resolved.enabled) {
    return findings;
  }

  const browserAuth = resolveBrowserControlAuth(cfg, env);
  if (!browserAuth.token && !browserAuth.password) {
    findings.push({
      checkId: "browser.control_no_auth",
      severity: "critical",
      title: "Browser control has no auth",
      detail:
        "Browser control HTTP routes are enabled but no gateway.auth token/password is configured. " +
        "Any local process (or SSRF to loopback) can call browser control endpoints.",
      remediation:
        "Set gateway.auth.token (recommended) or gateway.auth.password so browser control HTTP routes require authentication. Restarting the gateway will auto-generate gateway.auth.token when browser control is enabled.",
    });
  }

  for (const name of Object.keys(resolved.profiles)) {
    const profile = resolveProfile(resolved, name);
    if (!profile || profile.cdpIsLoopback) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(profile.cdpUrl);
    } catch {
      continue;
    }
    if (url.protocol === "http:") {
      findings.push({
        checkId: "browser.remote_cdp_http",
        severity: "warn",
        title: "Remote CDP uses HTTP",
        detail: `browser profile "${name}" uses http CDP (${profile.cdpUrl}); this is OK only if it's tailnet-only or behind an encrypted tunnel.`,
        remediation: `Prefer HTTPS/TLS or a tailnet-only endpoint for remote CDP.`,
      });
    }
  }

  return findings;
}
