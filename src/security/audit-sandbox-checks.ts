import { resolveSandboxConfigForAgent } from "../agents/sandbox.js";
import { SANDBOX_BROWSER_SECURITY_HASH_EPOCH } from "../agents/sandbox/constants.js";
import { execDockerRaw } from "../agents/sandbox/docker.js";
import { getBlockedBindReason } from "../agents/sandbox/validate-sandbox-security.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig } from "../config/config.js";
import type { SecurityAuditFinding } from "./audit.js";

type ExecDockerRawFn = typeof execDockerRaw;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function hasConfiguredDockerConfig(
  docker: Record<string, unknown> | undefined | null,
): docker is Record<string, unknown> {
  if (!docker || typeof docker !== "object") {
    return false;
  }
  return Object.values(docker).some((value) => value !== undefined);
}

function normalizeDockerLabelValue(raw: string | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed === "<no value>") {
    return null;
  }
  return trimmed;
}

async function listSandboxBrowserContainers(
  execDockerRawFn: ExecDockerRawFn,
): Promise<string[] | null> {
  try {
    const result = await execDockerRawFn(
      ["ps", "-a", "--filter", "label=openclaw.sandboxBrowser=1", "--format", "{{.Names}}"],
      { allowFailure: true },
    );
    if (result.code !== 0) {
      return null;
    }
    return result.stdout
      .toString("utf8")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

async function readSandboxBrowserHashLabels(params: {
  containerName: string;
  execDockerRawFn: ExecDockerRawFn;
}): Promise<{ configHash: string | null; epoch: string | null } | null> {
  try {
    const result = await params.execDockerRawFn(
      [
        "inspect",
        "-f",
        '{{ index .Config.Labels "openclaw.configHash" }}\t{{ index .Config.Labels "openclaw.browserConfigEpoch" }}',
        params.containerName,
      ],
      { allowFailure: true },
    );
    if (result.code !== 0) {
      return null;
    }
    const [hashRaw, epochRaw] = result.stdout.toString("utf8").split("\t");
    return {
      configHash: normalizeDockerLabelValue(hashRaw),
      epoch: normalizeDockerLabelValue(epochRaw),
    };
  } catch {
    return null;
  }
}

function parsePublishedHostFromDockerPortLine(line: string): string | null {
  const trimmed = line.trim();
  const rhs = trimmed.includes("->") ? (trimmed.split("->").at(-1)?.trim() ?? "") : trimmed;
  if (!rhs) {
    return null;
  }
  const bracketHost = rhs.match(/^\[([^\]]+)\]:\d+$/);
  if (bracketHost?.[1]) {
    return bracketHost[1];
  }
  const hostPort = rhs.match(/^([^:]+):\d+$/);
  if (hostPort?.[1]) {
    return hostPort[1];
  }
  return null;
}

function isLoopbackPublishHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
}

async function readSandboxBrowserPortMappings(params: {
  containerName: string;
  execDockerRawFn: ExecDockerRawFn;
}): Promise<string[] | null> {
  try {
    const result = await params.execDockerRawFn(["port", params.containerName], {
      allowFailure: true,
    });
    if (result.code !== 0) {
      return null;
    }
    return result.stdout
      .toString("utf8")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Exported collectors
// --------------------------------------------------------------------------

export function collectSandboxDockerNoopFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const configuredPaths: string[] = [];
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];

  const defaultsSandbox = cfg.agents?.defaults?.sandbox;
  const hasDefaultDocker = hasConfiguredDockerConfig(
    defaultsSandbox?.docker as Record<string, unknown> | undefined,
  );
  const defaultMode = defaultsSandbox?.mode ?? "off";
  const hasAnySandboxEnabledAgent = agents.some((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      return false;
    }
    return resolveSandboxConfigForAgent(cfg, entry.id).mode !== "off";
  });
  if (hasDefaultDocker && defaultMode === "off" && !hasAnySandboxEnabledAgent) {
    configuredPaths.push("agents.defaults.sandbox.docker");
  }

  for (const entry of agents) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      continue;
    }
    if (!hasConfiguredDockerConfig(entry.sandbox?.docker as Record<string, unknown> | undefined)) {
      continue;
    }
    if (resolveSandboxConfigForAgent(cfg, entry.id).mode === "off") {
      configuredPaths.push(`agents.list.${entry.id}.sandbox.docker`);
    }
  }

  if (configuredPaths.length === 0) {
    return findings;
  }

  findings.push({
    checkId: "sandbox.docker_config_mode_off",
    severity: "warn",
    title: "Sandbox docker settings configured while sandbox mode is off",
    detail:
      "These docker settings will not take effect until sandbox mode is enabled:\n" +
      configuredPaths.map((entry) => `- ${entry}`).join("\n"),
    remediation:
      'Enable sandbox mode (`agents.defaults.sandbox.mode="non-main"` or `"all"`) where needed, or remove unused docker settings.',
  });

  return findings;
}

export function collectSandboxDangerousConfigFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
  const findings: SecurityAuditFinding[] = [];
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];

  const configs: Array<{ source: string; docker: Record<string, unknown> }> = [];
  const defaultDocker = cfg.agents?.defaults?.sandbox?.docker;
  if (defaultDocker && typeof defaultDocker === "object") {
    configs.push({
      source: "agents.defaults.sandbox.docker",
      docker: defaultDocker as Record<string, unknown>,
    });
  }
  for (const entry of agents) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      continue;
    }
    const agentDocker = entry.sandbox?.docker;
    if (agentDocker && typeof agentDocker === "object") {
      configs.push({
        source: `agents.list.${entry.id}.sandbox.docker`,
        docker: agentDocker as Record<string, unknown>,
      });
    }
  }

  for (const { source, docker } of configs) {
    const binds = Array.isArray(docker.binds) ? docker.binds : [];
    for (const bind of binds) {
      if (typeof bind !== "string") {
        continue;
      }
      const blocked = getBlockedBindReason(bind);
      if (!blocked) {
        continue;
      }
      if (blocked.kind === "non_absolute") {
        findings.push({
          checkId: "sandbox.bind_mount_non_absolute",
          severity: "warn",
          title: "Sandbox bind mount uses a non-absolute source path",
          detail:
            `${source}.binds contains "${bind}" which uses source path "${blocked.sourcePath}". ` +
            "Non-absolute bind sources are hard to validate safely and may resolve unexpectedly.",
          remediation: `Rewrite "${bind}" to use an absolute host path (for example: /home/user/project:/project:ro).`,
        });
        continue;
      }
      const verb = blocked.kind === "covers" ? "covers" : "targets";
      findings.push({
        checkId: "sandbox.dangerous_bind_mount",
        severity: "critical",
        title: "Dangerous bind mount in sandbox config",
        detail:
          `${source}.binds contains "${bind}" which ${verb} blocked path "${blocked.blockedPath}". ` +
          "This can expose host system directories or the Docker socket to sandbox containers.",
        remediation: `Remove "${bind}" from ${source}.binds. Use project-specific paths instead.`,
      });
    }

    const network = typeof docker.network === "string" ? docker.network : undefined;
    if (network && network.trim().toLowerCase() === "host") {
      findings.push({
        checkId: "sandbox.dangerous_network_mode",
        severity: "critical",
        title: "Network host mode in sandbox config",
        detail: `${source}.network is "host" which bypasses container network isolation entirely.`,
        remediation: `Set ${source}.network to "bridge" or "none".`,
      });
    }

    const seccompProfile =
      typeof docker.seccompProfile === "string" ? docker.seccompProfile : undefined;
    if (seccompProfile && seccompProfile.trim().toLowerCase() === "unconfined") {
      findings.push({
        checkId: "sandbox.dangerous_seccomp_profile",
        severity: "critical",
        title: "Seccomp unconfined in sandbox config",
        detail: `${source}.seccompProfile is "unconfined" which disables syscall filtering.`,
        remediation: `Remove ${source}.seccompProfile or use a custom seccomp profile file.`,
      });
    }

    const apparmorProfile =
      typeof docker.apparmorProfile === "string" ? docker.apparmorProfile : undefined;
    if (apparmorProfile && apparmorProfile.trim().toLowerCase() === "unconfined") {
      findings.push({
        checkId: "sandbox.dangerous_apparmor_profile",
        severity: "critical",
        title: "AppArmor unconfined in sandbox config",
        detail: `${source}.apparmorProfile is "unconfined" which disables AppArmor enforcement.`,
        remediation: `Remove ${source}.apparmorProfile or use a named AppArmor profile.`,
      });
    }
  }

  const browserExposurePaths: string[] = [];
  const defaultBrowser = resolveSandboxConfigForAgent(cfg).browser;
  if (
    defaultBrowser.enabled &&
    defaultBrowser.network.trim().toLowerCase() === "bridge" &&
    !defaultBrowser.cdpSourceRange?.trim()
  ) {
    browserExposurePaths.push("agents.defaults.sandbox.browser");
  }
  for (const entry of agents) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      continue;
    }
    const browser = resolveSandboxConfigForAgent(cfg, entry.id).browser;
    if (!browser.enabled) {
      continue;
    }
    if (browser.network.trim().toLowerCase() !== "bridge") {
      continue;
    }
    if (browser.cdpSourceRange?.trim()) {
      continue;
    }
    browserExposurePaths.push(`agents.list.${entry.id}.sandbox.browser`);
  }
  if (browserExposurePaths.length > 0) {
    findings.push({
      checkId: "sandbox.browser_cdp_bridge_unrestricted",
      severity: "warn",
      title: "Sandbox browser CDP may be reachable by peer containers",
      detail:
        "These sandbox browser configs use Docker bridge networking with no CDP source restriction:\n" +
        browserExposurePaths.map((entry) => `- ${entry}`).join("\n"),
      remediation:
        "Set sandbox.browser.network to a dedicated bridge network (recommended default: openclaw-sandbox-browser), " +
        "or set sandbox.browser.cdpSourceRange (for example 172.21.0.1/32) to restrict container-edge CDP ingress.",
    });
  }

  return findings;
}

export async function collectSandboxBrowserHashLabelFindings(params?: {
  execDockerRawFn?: ExecDockerRawFn;
}): Promise<SecurityAuditFinding[]> {
  const findings: SecurityAuditFinding[] = [];
  const execFn = params?.execDockerRawFn ?? execDockerRaw;
  const containers = await listSandboxBrowserContainers(execFn);
  if (!containers || containers.length === 0) {
    return findings;
  }

  const missingHash: string[] = [];
  const staleEpoch: string[] = [];
  const nonLoopbackPublished: string[] = [];

  for (const containerName of containers) {
    const labels = await readSandboxBrowserHashLabels({ containerName, execDockerRawFn: execFn });
    if (!labels) {
      continue;
    }
    if (!labels.configHash) {
      missingHash.push(containerName);
    }
    if (labels.epoch !== SANDBOX_BROWSER_SECURITY_HASH_EPOCH) {
      staleEpoch.push(containerName);
    }
    const portMappings = await readSandboxBrowserPortMappings({
      containerName,
      execDockerRawFn: execFn,
    });
    if (!portMappings?.length) {
      continue;
    }
    const exposedMappings = portMappings.filter((line) => {
      const host = parsePublishedHostFromDockerPortLine(line);
      return Boolean(host && !isLoopbackPublishHost(host));
    });
    if (exposedMappings.length > 0) {
      nonLoopbackPublished.push(`${containerName} (${exposedMappings.join("; ")})`);
    }
  }

  if (missingHash.length > 0) {
    findings.push({
      checkId: "sandbox.browser_container.hash_label_missing",
      severity: "warn",
      title: "Sandbox browser container missing config hash label",
      detail:
        `Containers: ${missingHash.join(", ")}. ` +
        "These browser containers predate hash-based drift checks and may miss security remediations until recreated.",
      remediation: `${formatCliCommand("openclaw sandbox recreate --browser --all")} (add --force to skip prompt).`,
    });
  }

  if (staleEpoch.length > 0) {
    findings.push({
      checkId: "sandbox.browser_container.hash_epoch_stale",
      severity: "warn",
      title: "Sandbox browser container hash epoch is stale",
      detail:
        `Containers: ${staleEpoch.join(", ")}. ` +
        `Expected openclaw.browserConfigEpoch=${SANDBOX_BROWSER_SECURITY_HASH_EPOCH}.`,
      remediation: `${formatCliCommand("openclaw sandbox recreate --browser --all")} (add --force to skip prompt).`,
    });
  }

  if (nonLoopbackPublished.length > 0) {
    findings.push({
      checkId: "sandbox.browser_container.non_loopback_publish",
      severity: "critical",
      title: "Sandbox browser container publishes ports on non-loopback interfaces",
      detail:
        `Containers: ${nonLoopbackPublished.join(", ")}. ` +
        "Sandbox browser observer/control ports should stay loopback-only to avoid unintended remote access.",
      remediation:
        `${formatCliCommand("openclaw sandbox recreate --browser --all")} (add --force to skip prompt), ` +
        "then verify published ports are bound to 127.0.0.1.",
    });
  }

  return findings;
}
