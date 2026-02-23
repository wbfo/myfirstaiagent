import path from "node:path";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { createConfigIO } from "../config/io.js";
import type { OpenClawConfig, ConfigFileSnapshot } from "../config/types.js";
import { normalizeAgentId } from "../routing/session-key.js";
import {
    formatPermissionDetail,
    formatPermissionRemediation,
    inspectPathPermissions,
} from "./audit-fs.js";
import type { SecurityAuditFinding } from "./audit.js";
import type { ExecFn } from "./windows-acl.js";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function expandTilde(p: string, env: NodeJS.ProcessEnv): string | null {
    if (!p.startsWith("~")) {
        return p;
    }
    const home = typeof env.HOME === "string" && env.HOME.trim() ? env.HOME.trim() : null;
    if (!home) {
        return null;
    }
    if (p === "~") {
        return home;
    }
    if (p.startsWith("~/") || p.startsWith("~\\")) {
        return path.join(home, p.slice(2));
    }
    return null;
}

function resolveOAuthDir(env: NodeJS.ProcessEnv, stateDir: string): string {
    const oauthPath = env.OPENCLAW_OAUTH_DIR;
    if (typeof oauthPath === "string" && oauthPath.trim()) {
        const expanded = expandTilde(oauthPath, env);
        return expanded ? path.resolve(expanded) : path.join(stateDir, "oauth");
    }
    return path.join(stateDir, "oauth");
}

function isProbablySyncedPath(p: string): boolean {
    const s = p.toLowerCase();
    return (
        s.includes("icloud") ||
        s.includes("dropbox") ||
        s.includes("google drive") ||
        s.includes("googledrive") ||
        s.includes("onedrive")
    );
}

function looksLikeEnvRef(value: string): boolean {
    const v = value.trim();
    return v.startsWith("${") && v.endsWith("}");
}

// --------------------------------------------------------------------------
// Exported collectors
// --------------------------------------------------------------------------

export async function collectFilesystemFindings(params: {
    stateDir: string;
    configPath: string;
    env?: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
    execIcacls?: ExecFn;
}): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];

    const stateDirPerms = await inspectPathPermissions(params.stateDir, {
        env: params.env,
        platform: params.platform,
        exec: params.execIcacls,
    });
    if (stateDirPerms.ok) {
        if (stateDirPerms.isSymlink) {
            findings.push({
                checkId: "fs.state_dir.symlink",
                severity: "warn",
                title: "State dir is a symlink",
                detail: `${params.stateDir} is a symlink; treat this as an extra trust boundary.`,
            });
        }
        if (stateDirPerms.worldWritable) {
            findings.push({
                checkId: "fs.state_dir.perms_world_writable",
                severity: "critical",
                title: "State dir is world-writable",
                detail: `${formatPermissionDetail(params.stateDir, stateDirPerms)}; other users can write into your OpenClaw state.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.stateDir,
                    perms: stateDirPerms,
                    isDir: true,
                    posixMode: 0o700,
                    env: params.env,
                }),
            });
        } else if (stateDirPerms.groupWritable) {
            findings.push({
                checkId: "fs.state_dir.perms_group_writable",
                severity: "warn",
                title: "State dir is group-writable",
                detail: `${formatPermissionDetail(params.stateDir, stateDirPerms)}; group users can write into your OpenClaw state.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.stateDir,
                    perms: stateDirPerms,
                    isDir: true,
                    posixMode: 0o700,
                    env: params.env,
                }),
            });
        } else if (stateDirPerms.groupReadable || stateDirPerms.worldReadable) {
            findings.push({
                checkId: "fs.state_dir.perms_readable",
                severity: "warn",
                title: "State dir is readable by others",
                detail: `${formatPermissionDetail(params.stateDir, stateDirPerms)}; consider restricting to 700.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.stateDir,
                    perms: stateDirPerms,
                    isDir: true,
                    posixMode: 0o700,
                    env: params.env,
                }),
            });
        }
    }

    const configPerms = await inspectPathPermissions(params.configPath, {
        env: params.env,
        platform: params.platform,
        exec: params.execIcacls,
    });
    if (configPerms.ok) {
        const skipReadablePermWarnings = configPerms.isSymlink;
        if (configPerms.isSymlink) {
            findings.push({
                checkId: "fs.config.symlink",
                severity: "warn",
                title: "Config file is a symlink",
                detail: `${params.configPath} is a symlink; make sure you trust its target.`,
            });
        }
        if (configPerms.worldWritable || configPerms.groupWritable) {
            findings.push({
                checkId: "fs.config.perms_writable",
                severity: "critical",
                title: "Config file is writable by others",
                detail: `${formatPermissionDetail(params.configPath, configPerms)}; another user could change gateway/auth/tool policies.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.configPath,
                    perms: configPerms,
                    isDir: false,
                    posixMode: 0o600,
                    env: params.env,
                }),
            });
        } else if (!skipReadablePermWarnings && configPerms.worldReadable) {
            findings.push({
                checkId: "fs.config.perms_world_readable",
                severity: "critical",
                title: "Config file is world-readable",
                detail: `${formatPermissionDetail(params.configPath, configPerms)}; config can contain tokens and private settings.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.configPath,
                    perms: configPerms,
                    isDir: false,
                    posixMode: 0o600,
                    env: params.env,
                }),
            });
        } else if (!skipReadablePermWarnings && configPerms.groupReadable) {
            findings.push({
                checkId: "fs.config.perms_group_readable",
                severity: "warn",
                title: "Config file is group-readable",
                detail: `${formatPermissionDetail(params.configPath, configPerms)}; config can contain tokens and private settings.`,
                remediation: formatPermissionRemediation({
                    targetPath: params.configPath,
                    perms: configPerms,
                    isDir: false,
                    posixMode: 0o600,
                    env: params.env,
                }),
            });
        }
    }

    return findings;
}

export function collectSyncedFolderFindings(params: {
    stateDir: string;
    configPath: string;
}): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    if (isProbablySyncedPath(params.stateDir) || isProbablySyncedPath(params.configPath)) {
        findings.push({
            checkId: "fs.synced_dir",
            severity: "warn",
            title: "State/config path looks like a synced folder",
            detail: `stateDir=${params.stateDir}, configPath=${params.configPath}. Synced folders (iCloud/Dropbox/OneDrive/Google Drive) can leak tokens and transcripts onto other devices.`,
            remediation: "Keep OPENCLAW_STATE_DIR on a local-only volume.",
        });
    }
    return findings;
}

export function collectSecretsInConfigFindings(cfg: OpenClawConfig): SecurityAuditFinding[] {
    const findings: SecurityAuditFinding[] = [];
    const password =
        typeof cfg.gateway?.auth?.password === "string" ? cfg.gateway.auth.password.trim() : "";
    if (password && !looksLikeEnvRef(password)) {
        findings.push({
            checkId: "config.secrets.gateway_password_in_config",
            severity: "warn",
            title: "Gateway password is stored in config",
            detail:
                "gateway.auth.password is set in the config file; prefer environment variables for secrets when possible.",
            remediation:
                "Prefer OPENCLAW_GATEWAY_PASSWORD (env) and remove gateway.auth.password from disk.",
        });
    }

    const hooksToken = typeof cfg.hooks?.token === "string" ? cfg.hooks.token.trim() : "";
    if (cfg.hooks?.enabled === true && hooksToken && !looksLikeEnvRef(hooksToken)) {
        findings.push({
            checkId: "config.secrets.hooks_token_in_config",
            severity: "info",
            title: "Hooks token is stored in config",
            detail:
                "hooks.token is set in the config file; keep config perms tight and treat it like an API secret.",
        });
    }

    return findings;
}

export async function readConfigSnapshotForAudit(params: {
    env: NodeJS.ProcessEnv;
    configPath: string;
}): Promise<ConfigFileSnapshot> {
    return await createConfigIO({
        env: params.env,
        configPath: params.configPath,
    }).readConfigFileSnapshot();
}

export async function collectIncludeFilePermFindings(params: {
    snapshot: ConfigFileSnapshot;
    env: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
    execIcacls?: ExecFn;
}): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];
    const includes = params.snapshot.includedFiles ?? [];

    for (const file of includes) {
        const absPath = path.resolve(file);
        // eslint-disable-next-line no-await-in-loop
        const perms = await inspectPathPermissions(absPath, {
            env: params.env,
            platform: params.platform,
            exec: params.execIcacls,
        });
        if (!perms.ok) {
            continue;
        }

        if (perms.worldWritable || perms.groupWritable) {
            findings.push({
                checkId: "fs.config_include.perms_writable",
                severity: "critical",
                title: "Included config file is writable by others",
                detail: `${formatPermissionDetail(absPath, perms)}; another user could inject malicious config via this include.`,
                remediation: formatPermissionRemediation({
                    targetPath: absPath,
                    perms,
                    isDir: false,
                    posixMode: 0o600,
                    env: params.env,
                }),
            });
        } else if (perms.worldReadable || perms.groupReadable) {
            findings.push({
                checkId: "fs.config_include.perms_readable",
                severity: "warn",
                title: "Included config file is readable by others",
                detail: `${formatPermissionDetail(absPath, perms)}; includes often contain sensitive tool or account definitions.`,
                remediation: formatPermissionRemediation({
                    targetPath: absPath,
                    perms,
                    isDir: false,
                    posixMode: 0o600,
                    env: params.env,
                }),
            });
        }
    }

    return findings;
}

export async function collectStateDeepFilesystemFindings(params: {
    cfg: OpenClawConfig;
    env: NodeJS.ProcessEnv;
    stateDir: string;
    platform?: NodeJS.Platform;
    execIcacls?: ExecFn;
}): Promise<SecurityAuditFinding[]> {
    const findings: SecurityAuditFinding[] = [];
    const oauthDir = resolveOAuthDir(params.env, params.stateDir);

    const oauthPerms = await inspectPathPermissions(oauthDir, {
        env: params.env,
        platform: params.platform,
        exec: params.execIcacls,
    });
    if (oauthPerms.ok && oauthPerms.isDir) {
        if (oauthPerms.worldWritable || oauthPerms.groupWritable) {
            findings.push({
                checkId: "fs.credentials_dir.perms_writable",
                severity: "critical",
                title: "Credentials dir is writable by others",
                detail: `${formatPermissionDetail(oauthDir, oauthPerms)}; another user could drop/modify credential files.`,
                remediation: formatPermissionRemediation({
                    targetPath: oauthDir,
                    perms: oauthPerms,
                    isDir: true,
                    posixMode: 0o700,
                    env: params.env,
                }),
            });
        } else if (oauthPerms.groupReadable || oauthPerms.worldReadable) {
            findings.push({
                checkId: "fs.credentials_dir.perms_readable",
                severity: "warn",
                title: "Credentials dir is readable by others",
                detail: `${formatPermissionDetail(oauthDir, oauthPerms)}; credentials and allowlists can be sensitive.`,
                remediation: formatPermissionRemediation({
                    targetPath: oauthDir,
                    perms: oauthPerms,
                    isDir: true,
                    posixMode: 0o700,
                    env: params.env,
                }),
            });
        }
    }

    const agentIds = Array.isArray(params.cfg.agents?.list)
        ? params.cfg.agents?.list
            .map((a) => (a && typeof a === "object" && typeof a.id === "string" ? a.id.trim() : ""))
            .filter(Boolean)
        : [];
    const defaultAgentId = resolveDefaultAgentId(params.cfg);
    const ids = Array.from(new Set([defaultAgentId, ...agentIds])).map((id) => normalizeAgentId(id));

    for (const agentId of ids) {
        const agentDir = path.join(params.stateDir, "agents", agentId, "agent");
        const authPath = path.join(agentDir, "auth-profiles.json");
        // eslint-disable-next-line no-await-in-loop
        const authPerms = await inspectPathPermissions(authPath, {
            env: params.env,
            platform: params.platform,
            exec: params.execIcacls,
        });
        if (authPerms.ok) {
            if (authPerms.worldWritable || authPerms.groupWritable) {
                findings.push({
                    checkId: "fs.auth_profiles.perms_writable",
                    severity: "critical",
                    title: "auth-profiles.json is writable by others",
                    detail: `${formatPermissionDetail(authPath, authPerms)}; another user could inject credentials.`,
                    remediation: formatPermissionRemediation({
                        targetPath: authPath,
                        perms: authPerms,
                        isDir: false,
                        posixMode: 0o600,
                        env: params.env,
                    }),
                });
            } else if (authPerms.worldReadable || authPerms.groupReadable) {
                findings.push({
                    checkId: "fs.auth_profiles.perms_readable",
                    severity: "warn",
                    title: "auth-profiles.json is readable by others",
                    detail: `${formatPermissionDetail(authPath, authPerms)}; auth-profiles.json contains API keys and OAuth tokens.`,
                    remediation: formatPermissionRemediation({
                        targetPath: authPath,
                        perms: authPerms,
                        isDir: false,
                        posixMode: 0o600,
                        env: params.env,
                    }),
                });
            }
        }

        const storePath = path.join(params.stateDir, "agents", agentId, "sessions", "sessions.json");
        // eslint-disable-next-line no-await-in-loop
        const storePerms = await inspectPathPermissions(storePath, {
            env: params.env,
            platform: params.platform,
            exec: params.execIcacls,
        });
        if (storePerms.ok) {
            if (storePerms.worldReadable || storePerms.groupReadable) {
                findings.push({
                    checkId: "fs.sessions_store.perms_readable",
                    severity: "warn",
                    title: "sessions.json is readable by others",
                    detail: `${formatPermissionDetail(storePath, storePerms)}; routing and transcript metadata can be sensitive.`,
                    remediation: formatPermissionRemediation({
                        targetPath: storePath,
                        perms: storePerms,
                        isDir: false,
                        posixMode: 0o600,
                        env: params.env,
                    }),
                });
            }
        }
    }

    const logFile =
        typeof params.cfg.logging?.file === "string" ? params.cfg.logging.file.trim() : "";
    if (logFile) {
        const expanded = logFile.startsWith("~") ? expandTilde(logFile, params.env || process.env) : logFile;
        if (expanded) {
            const logPath = path.resolve(expanded);
            const logPerms = await inspectPathPermissions(logPath, {
                env: params.env,
                platform: params.platform,
                exec: params.execIcacls,
            });
            if (logPerms.ok) {
                if (logPerms.worldReadable || logPerms.groupReadable) {
                    findings.push({
                        checkId: "fs.log_file.perms_readable",
                        severity: "warn",
                        title: "Log file is readable by others",
                        detail: `${formatPermissionDetail(logPath, logPerms)}; logs can contain private messages and tool output.`,
                        remediation: formatPermissionRemediation({
                            targetPath: logPath,
                            perms: logPerms,
                            isDir: false,
                            posixMode: 0o600,
                            env: params.env,
                        }),
                    });
                }
            }
        }
    }

    return findings;
}