import {
    formatPermissionDetail,
    formatPermissionRemediation,
    inspectPathPermissions,
} from "./audit-fs.js";
import type { SecurityAuditFinding } from "./audit.js";
import type { ExecFn } from "./windows-acl.js";

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