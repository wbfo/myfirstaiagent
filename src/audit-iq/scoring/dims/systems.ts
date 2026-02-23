import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreSystems(brief: AuditBrief): DimensionScore {
    const findings: AuditFinding[] = [];
    let score = 100;

    if (!brief.systems.hasCrm) {
        score -= 20;
        findings.push({
            dimension: "systems",
            severity: "warn",
            title: "No CRM in place",
            detail: "Relationships and pipeline managed in a spreadsheet or memory do not scale past 20 active prospects.",
            remediation: "Implement HubSpot Free or Notion CRM. Migrate all active leads within one week.",
        });
    }

    if (!brief.systems.hasProjectManagement) {
        score -= 15;
        findings.push({
            dimension: "systems",
            severity: "warn",
            title: "No project management system",
            detail: "Tasks tracked in chat or email create accountability gaps and missed deadlines.",
            remediation: "Adopt Linear, Asana, or Notion. All open work items should be there by Friday.",
        });
    }

    if (!brief.systems.hasDataBackup) {
        score -= 30;
        findings.push({
            dimension: "systems",
            severity: "critical",
            title: "No confirmed data backup",
            detail: "One hardware failure or ransomware event could destroy years of work with no recovery path.",
            remediation: "Enable automated cloud backup (Google Drive, Backblaze, or AWS S3) by end of week. Verify a restore.",
        });
    }

    const stack = brief.systems.toolStackHealth;
    if (stack === "fragmented") {
        score -= 10;
        findings.push({
            dimension: "systems",
            severity: "info",
            title: "Fragmented tool stack",
            detail: "Multiple disconnected tools create data silos and increase cognitive overhead.",
            remediation: "Audit all tools in use. Eliminate duplicates. Aim for 5 core tools max.",
        });
    }

    return {
        dimension: "systems",
        score: Math.max(0, score),
        weight: 1.0,
        grade: gradeFromScore(Math.max(0, score)),
        findings,
    };
}
