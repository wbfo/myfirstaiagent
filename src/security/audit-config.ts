import { isToolAllowedByPolicies } from "../agents/pi-tools.policy.js";
import {
    resolveSandboxConfigForAgent,
    resolveSandboxToolPolicyForAgent,
} from "../agents/sandbox.js";
import { resolveToolProfilePolicy } from "../agents/tool-policy.js";
import { resolveBrowserConfig } from "../browser/config.js";
import type { OpenClawConfig } from "../config/config.js";
import type { AgentToolsConfig } from "../config/types.tools.js";
import { inferParamBFromIdOrName } from "../shared/model-param-b.js";
import { pickSandboxToolPolicy } from "./audit-tool-policy.js";
import type { SecurityAuditFinding } from "./audit.js";
import type { SandboxToolPolicy } from "../agents/sandbox/types.js";

const SMALL_MODEL_PARAM_B_MAX = 300;

const LEGACY_MODEL_PATTERNS: Array<{ id: string; re: RegExp; label: string }> = [
    { id: "openai.gpt35", re: /\bgpt-3\.5\b/i, label: "GPT-3.5 family" },
    { id: "anthropic.claude2", re: /\bclaude-(instant|2)\b/i, label: "Claude 2/Instant family" },
    { id: "openai.gpt4_legacy", re: /\bgpt-4-(0314|0613)\b/i, label: "Legacy GPT-4 snapshots" },
];

const WEAK_TIER_MODEL_PATTERNS: Array<{ id: string; re: RegExp; label: string }> = [
    { id: "anthropic.haiku", re: /\bhaiku\b/i, label: "Haiku tier (smaller model)" },
];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function normalizeAllowFromList(list: Array<string | number> | undefined | null): string[] {
    if (!Array.isArray(list)) {
        return [];
    }
    return list.map((v) => String(v).trim()).filter(Boolean);
}

function summarizeGroupPolicy(cfg: OpenClawConfig): {
    open: number;
    allowlist: number;
    other: number;
} {
    const channels = cfg.channels as Record<string, unknown> | undefined;
    if (!channels || typeof channels !== "object") {
        return { open: 0, allowlist: 0, other: 0 };
    }
    let open = 0;
    let allowlist = 0;
    let other = 0;
    for (const value of Object.values(channels)) {
        if (!value || typeof value !== "object") {
            continue;
        }
        const section = value as Record<string, unknown>;
        const policy = section.groupPolicy;
        if (policy === "open") {
            open += 1;
        } else if (policy === "allowlist") {
            allowlist += 1;
        } else {
            other += 1;
        }
    }
    return { open, allowlist, other };
}

type ModelRef = { id: string; source: string };

function addModel(models: ModelRef[], raw: unknown, source: string) {
    if (typeof raw !== "string") {
        return;
    }
    const id = raw.trim();
    if (!id) {
        return;
    }
    models.push({ id, source });
}

function collectModels(cfg: OpenClawConfig): ModelRef[] {
    const out: ModelRef[] = [];
    addModel(out, cfg.agents?.defaults?.model?.primary, "agents.defaults.model.primary");
    for (const f of cfg.agents?.defaults?.model?.fallbacks ?? []) {
        addModel(out, f, "agents.defaults.model.fallbacks");
    }
    addModel(out, cfg.agents?.defaults?.imageModel?.primary, "agents.defaults.imageModel.primary");
    for (const f of cfg.agents?.defaults?.imageModel?.fallbacks ?? []) {
        addModel(out, f, "agents.defaults.imageModel.fallbacks");
    }

    const list = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
    for (const agent of list ?? []) {
        if (!agent || typeof agent !== "object") {
            continue;
        }
        const id =
            typeof (agent as { id?: unknown }).id === "string" ? (agent as { id: string }).id : "";
        const model = (agent as { model?: unknown }).model;
        if (typeof model === "string") {
            addModel(out, model, `agents.list.${id}.model`);
        } else if (model && typeof model === "object") {
            addModel(out, (model as { primary?: unknown }).primary, `agents.list.${id}.model.primary`);
            const fallbacks = (model as { fallbacks?: unknown }).fallbacks;
            if (Array.isArray(fallbacks)) {
                for (const f of fallbacks) {
                    addModel(out, f, `agents.list.${id}.model.fallbacks`);
                }
            }
        }
    }
    return out;
}

function isGptModel(id: string): boolean {
    return /\bgpt-/i.test(id);
}

function isGpt5OrHigher(id: string): boolean {
    return /\bgpt-5(?:\b|[.-])/i.test(id);
}

function isClaudeModel(id: string): boolean {
    return /\bclaude-/i.test(id);
}

function isClaude45OrHigher(id: string): boolean {
    return /\bclaude-[^\s/]*?(?:-4-?(?:[5-9]|[1-9]\d)\b|4\.(?:[5-9]|[1-9]\d)\b|-[5-9](?:\b|[.-]))/i.test(
        id,
    );
}

function extractAgentIdFromSource(source: string): string | null {
    const match = source.match(/^agents\.list\.([^.]*)\./);
    return match?.[1] ?? null;
}

function resolveToolPolicies(params: {
    cfg: OpenClawConfig;
    agentTools?: AgentToolsConfig;
    sandboxMode?: "off" | "non-main" | "all";
    agentId?: string | null;
}): SandboxToolPolicy[] {
    const policies: SandboxToolPolicy[] = [];
    const profile = params.agentTools?.profile ?? params.cfg.tools?.profile;
    const profilePolicy = resolveToolProfilePolicy(profile);
    if (profilePolicy) {
        policies.push(profilePolicy);
    }

    const globalPolicy = pickSandboxToolPolicy(params.cfg.tools ?? undefined);
    if (globalPolicy) {
        policies.push(globalPolicy);
    }

    const agentPolicy = pickSandboxToolPolicy(params.agentTools);
    if (agentPolicy) {
        policies.push(agentPolicy);
    }

    if (params.sandboxMode === "all") {
        const sandboxPolicy = resolveSandboxToolPolicyForAgent(params.cfg, params.agentId ?? undefined);
        policies.push(sandboxPolicy);
    }

    return policies;
}

function hasWebSearchKey(cfg: OpenClawConfig, env: NodeJS.ProcessEnv): boolean {
    const search = cfg.tools?.web?.search;
    return Boolean(
        search?.apiKey ||
        search?.perplexity?.apiKey ||
        env.BRAVE_API_KEY ||
        env.PERPLEXITY_API_KEY ||
        env.OPENROUTER_API_KEY,
    );
}

function isWebSearchEnabled(cfg: OpenClawConfig, env: NodeJS.ProcessEnv): boolean {
    const enabled = cfg.tools?.web?.search?.enabled;
    if (enabled === false) {
        return false;
    }
    if (enabled === true) {
        return true;
    }
    return hasWebSearchKey(cfg, env);
}

function isWebFetchEnabled(cfg: OpenClawConfig): boolean {
    const enabled = cfg.tools?.web?.fetch?.enabled;
    if (enabled === false) {
        return false;
    }
    return true;
}

function isBrowserEnabled(cfg: OpenClawConfig): boolean {
    try {
        return resolveBrowserConfig(cfg.browser, cfg).enabled;
    } catch {
        return true;
    }
}

// --------------------------------------------------------------------------
// Exported collectors
// --------------------------------------------------------------------------

export function collectAttackSurfaceSummaryFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
    const group = summarizeGroupPolicy(cfg);
    const elevated = cfg.tools?.elevated?.enabled !== false;
    const webhooksEnabled = cfg.hooks?.enabled === true;
    const internalHooksEnabled = cfg.hooks?.internal?.enabled === true;
    const browserEnabled = cfg.browser?.enabled ?? true;

    const detail =
        `groups: open=${group.open}, allowlist=${group.allowlist}` +
        `\n` +
        `tools.elevated: ${elevated ? "enabled" : "disabled"}` +
        `\n` +
        `hooks.webhooks: ${webhooksEnabled ? "enabled" : "disabled"}` +
        `\n` +
        `hooks.internal: ${internalHooksEnabled ? "enabled" : "disabled"}` +
        `\n` +
        `browser control: ${browserEnabled ? "enabled" : "disabled"}`;

    return [
        {
            checkId: "summary.attack_surface",
            severity: "info",
            title: "Attack surface summary",
            detail,
        },
    ];
}

export function collectLoggingFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
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

export function collectMinimalProfileOverrideFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    if (cfg.tools?.profile !== "minimal") {
        return findings;
    }

    const overrides = (cfg.agents?.list ?? [])
        .filter((entry): entry is { id: string; tools?: AgentToolsConfig } => {
            return Boolean(
                entry &&
                typeof entry === "object" &&
                typeof entry.id === "string" &&
                entry.tools?.profile &&
                entry.tools.profile !== "minimal",
            );
        })
        .map((entry) => `${entry.id}=${entry.tools?.profile}`);

    if (overrides.length === 0) {
        return findings;
    }

    findings.push({
        checkId: "tools.profile_minimal_overridden",
        severity: "warn",
        title: "Global tools.profile=minimal is overridden by agent profiles",
        detail:
            "Global minimal profile is set, but these agent profiles take precedence:\n" +
            overrides.map((entry) => `- agents.list.${entry}`).join("\n"),
        remediation:
            'Set those agents to `tools.profile="minimal"` (or remove the agent override) if you want minimal tools enforced globally.',
    });

    return findings;
}

export function collectModelHygieneFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    const models = collectModels(cfg);
    if (models.length === 0) {
        return findings;
    }

    const weakMatches = new Map<string, { model: string; source: string; reasons: string[] }>();
    const addWeakMatch = (model: string, source: string, reason: string) => {
        const key = `${model}@@${source}`;
        const existing = weakMatches.get(key);
        if (!existing) {
            weakMatches.set(key, { model, source, reasons: [reason] });
            return;
        }
        if (!existing.reasons.includes(reason)) {
            existing.reasons.push(reason);
        }
    };

    for (const entry of models) {
        for (const pat of WEAK_TIER_MODEL_PATTERNS) {
            if (pat.re.test(entry.id)) {
                addWeakMatch(entry.id, entry.source, pat.label);
                break;
            }
        }
        if (isGptModel(entry.id) && !isGpt5OrHigher(entry.id)) {
            addWeakMatch(entry.id, entry.source, "Below GPT-5 family");
        }
        if (isClaudeModel(entry.id) && !isClaude45OrHigher(entry.id)) {
            addWeakMatch(entry.id, entry.source, "Below Claude 4.5");
        }
    }

    const matches: Array<{ model: string; source: string; reason: string }> = [];
    for (const entry of models) {
        for (const pat of LEGACY_MODEL_PATTERNS) {
            if (pat.re.test(entry.id)) {
                matches.push({ model: entry.id, source: entry.source, reason: pat.label });
                break;
            }
        }
    }

    if (matches.length > 0) {
        const lines = matches
            .slice(0, 12)
            .map((m) => `- ${m.model} (${m.reason}) @ ${m.source}`)
            .join("\n");
        const more = matches.length > 12 ? `\n…${matches.length - 12} more` : "";
        findings.push({
            checkId: "models.legacy",
            severity: "warn",
            title: "Some configured models look legacy",
            detail:
                "Older/legacy models can be less robust against prompt injection and tool misuse.\n" +
                lines +
                more,
            remediation: "Prefer modern, instruction-hardened models for any bot that can run tools.",
        });
    }

    if (weakMatches.size > 0) {
        const lines = Array.from(weakMatches.values())
            .slice(0, 12)
            .map((m) => `- ${m.model} (${m.reasons.join("; ")}) @ ${m.source}`)
            .join("\n");
        const more = weakMatches.size > 12 ? `\n…${weakMatches.size - 12} more` : "";
        findings.push({
            checkId: "models.weak_tier",
            severity: "warn",
            title: "Some configured models are below recommended tiers",
            detail:
                "Smaller/older models are generally more susceptible to prompt injection and tool misuse.\n" +
                lines +
                more,
            remediation:
                "Use the latest, top-tier model for any bot with tools or untrusted inboxes. Avoid Haiku tiers; prefer GPT-5+ and Claude 4.5+.",
        });
    }

    return findings;
}

export function collectSmallModelRiskFindings(params: {
    cfg: OpenClawConfig;
    env: NodeJS.ProcessEnv;
}): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    const models = collectModels(params.cfg).filter((entry) => !entry.source.includes("imageModel"));
    if (models.length === 0) {
        return findings;
    }

    const smallModels = models
        .map((entry) => {
            const paramB = inferParamBFromIdOrName(entry.id);
            if (!paramB || paramB > SMALL_MODEL_PARAM_B_MAX) {
                return null;
            }
            return { ...entry, paramB };
        })
        .filter((entry): entry is { id: string; source: string; paramB: number } => Boolean(entry));

    if (smallModels.length === 0) {
        return findings;
    }

    let hasUnsafe = false;
    const modelLines: string[] = [];
    const exposureSet = new Set<string>();
    for (const entry of smallModels) {
        const agentId = extractAgentIdFromSource(entry.source);
        const sandboxMode = resolveSandboxConfigForAgent(params.cfg, agentId ?? undefined).mode;
        const agentTools =
            agentId && params.cfg.agents?.list
                ? params.cfg.agents.list.find((agent: any) => agent?.id === agentId)?.tools
                : undefined;
        const policies = resolveToolPolicies({
            cfg: params.cfg,
            agentTools,
            sandboxMode,
            agentId,
        });
        const exposed: string[] = [];
        if (isWebSearchEnabled(params.cfg, params.env)) {
            if (isToolAllowedByPolicies("web_search", policies)) {
                exposed.push("web_search");
            }
        }
        if (isWebFetchEnabled(params.cfg)) {
            if (isToolAllowedByPolicies("web_fetch", policies)) {
                exposed.push("web_fetch");
            }
        }
        if (isBrowserEnabled(params.cfg)) {
            if (isToolAllowedByPolicies("browser", policies)) {
                exposed.push("browser");
            }
        }
        for (const tool of exposed) {
            exposureSet.add(tool);
        }
        const sandboxLabel = sandboxMode === "all" ? "sandbox=all" : `sandbox=${sandboxMode}`;
        const exposureLabel = exposed.length > 0 ? ` web=[${exposed.join(", ")}]` : " web=[off]";
        const safe = sandboxMode === "all" && exposed.length === 0;
        if (!safe) {
            hasUnsafe = true;
        }
        const statusLabel = safe ? "ok" : "unsafe";
        modelLines.push(
            `- ${entry.id} (${entry.paramB}B) @ ${entry.source} (${statusLabel}; ${sandboxLabel};${exposureLabel})`,
        );
    }

    const exposureList = Array.from(exposureSet);
    const exposureDetail =
        exposureList.length > 0
            ? `Uncontrolled input tools allowed: ${exposureList.join(", ")}.`
            : "No web/browser tools detected for these models.";

    findings.push({
        checkId: "models.small_params",
        severity: hasUnsafe ? "critical" : "info",
        title: "Small models require sandboxing and web tools disabled",
        detail:
            `Small models (<=${SMALL_MODEL_PARAM_B_MAX}B params) detected:\n` +
            modelLines.join("\n") +
            `\n` +
            exposureDetail +
            `\n` +
            "Small models are not recommended for untrusted inputs.",
        remediation:
            'If you must use small models, enable sandboxing for all sessions (agents.defaults.sandbox.mode="all") and disable web_search/web_fetch/browser (tools.deny=["group:web","browser"]).',
    });

    return findings;
}

export function collectElevatedFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
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

export function collectExecRuntimeFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
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
    const riskyAgents = (agents as any[])
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
