import type { AuditBrief, AuditFinding, AuditReport, DimensionScore } from "../types.js";
import { gradeFromScore } from "../types.js";
import { scoreFinance } from "./dims/finance.js";
import { scoreMarketing } from "./dims/marketing.js";
import { scoreOperations } from "./dims/operations.js";
import { scoreRisk } from "./dims/risk.js";
import { scoreSystems } from "./dims/systems.js";
import { scoreTeam } from "./dims/team.js";

function countBySeverity(findings: AuditFinding[]) {
    let critical = 0, warn = 0, info = 0, ok = 0;
    for (const f of findings) {
        if (f.severity === "critical") critical++;
        else if (f.severity === "warn") warn++;
        else if (f.severity === "info") info++;
        else ok++;
    }
    return { critical, warn, info, ok };
}

function weightedComposite(dimensions: DimensionScore[]): number {
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedSum = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function topFindings(dimensions: DimensionScore[], limit = 5): AuditFinding[] {
    const all = dimensions.flatMap((d) => d.findings);
    const severityOrder: Record<AuditFinding["severity"], number> = {
        critical: 0,
        warn: 1,
        info: 2,
        ok: 3,
    };
    return all
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        .slice(0, limit);
}

/**
 * Run all six dimension scorers against a validated AuditBrief
 * and assemble an AuditReport.
 */
export function runScoringEngine(brief: AuditBrief): AuditReport {
    const dimensions: DimensionScore[] = [
        scoreOperations(brief),
        scoreFinance(brief),
        scoreMarketing(brief),
        scoreTeam(brief),
        scoreSystems(brief),
        scoreRisk(brief),
    ];

    const compositeScore = weightedComposite(dimensions);
    const allFindings = dimensions.flatMap((d) => d.findings);

    return {
        ts: Date.now(),
        company: brief.company,
        dimensions,
        compositeScore,
        compositeGrade: gradeFromScore(compositeScore),
        topFindings: topFindings(dimensions),
        summary: countBySeverity(allFindings),
    };
}
