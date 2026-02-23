/**
 * Shared types for the X AuditIQ scoring engine.
 *
 * AuditBrief      — structured intake from a client form
 * DimensionScore  — score + findings for one audit dimension
 * AuditReport     — assembled output of all dimension scores
 * AuditSnippet    — trimmed free-hook version of the report
 */

export type AuditDimension =
    | "operations"
    | "finance"
    | "marketing"
    | "team"
    | "systems"
    | "risk";

export type AuditSeverity = "critical" | "warn" | "info" | "ok";

export type AuditFinding = {
    dimension: AuditDimension;
    severity: AuditSeverity;
    title: string;
    detail: string;
    remediation?: string;
};

export type DimensionScore = {
    dimension: AuditDimension;
    score: number;       // 0–100
    weight: number;      // relative weight in composite score
    grade: "A" | "B" | "C" | "D" | "F";
    findings: AuditFinding[];
};

export type AuditBrief = {
    /** Company basics */
    company: {
        name: string;
        industry: string;
        stage: "pre-revenue" | "early" | "growth" | "mature";
        teamSize: number;
        annualRevenue?: number;    // USD, optional
        foundedYear?: number;
    };
    /** Self-reported dimension inputs */
    operations: {
        hasDocumentedProcesses: boolean;
        hasAutomation: boolean;
        avgCycleTimeDays?: number;
        primaryBottleneck?: string;
    };
    finance: {
        hasCashFlowVisibility: boolean;
        hasMonthlyClose: boolean;
        burnRateMonths?: number;
        revenueGrowthPct?: number;   // last 12 months
        primaryFinancialRisk?: string;
    };
    marketing: {
        hasIcp: boolean;            // Ideal Customer Profile defined
        hasRepeatableAcquisition: boolean;
        primaryChannel?: string;
        conversionRatePct?: number;
        brandStrength?: "none" | "emerging" | "established";
    };
    team: {
        hasOrChart: boolean;
        hasSinglePointOfFailure: boolean;
        keyPersonDependency?: string;
        cultureRating?: 1 | 2 | 3 | 4 | 5;
    };
    systems: {
        hasCrm: boolean;
        hasProjectManagement: boolean;
        hasDataBackup: boolean;
        toolStackHealth?: "fragmented" | "adequate" | "optimized";
    };
    risk: {
        hasContractTemplates: boolean;
        hasInsurance: boolean;
        hasComplianceReview: boolean;
        topExistentialRisk?: string;
    };
};

export type AuditReport = {
    ts: number;
    company: AuditBrief["company"];
    dimensions: DimensionScore[];
    compositeScore: number;   // weighted average 0–100
    compositeGrade: "A" | "B" | "C" | "D" | "F";
    topFindings: AuditFinding[];   // Top 5 across all dims by severity
    summary: {
        critical: number;
        warn: number;
        info: number;
        ok: number;
    };
};

export type AuditSnippet = {
    company: string;
    compositeGrade: AuditReport["compositeGrade"];
    topFindings: Pick<AuditFinding, "title" | "severity" | "detail">[];
    teaser: string;   // CTA text pointing to full report
};

export function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    if (score >= 45) return "D";
    return "F";
}
