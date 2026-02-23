import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreFinance(brief: AuditBrief): DimensionScore {
    const findings: AuditFinding[] = [];
    let score = 100;

    if (!brief.finance.hasCashFlowVisibility) {
        score -= 35;
        findings.push({
            dimension: "finance",
            severity: "critical",
            title: "No cash flow visibility",
            detail: "Operating without real-time cash position awareness is the leading cause of preventable business failure.",
            remediation: "Implement a weekly cash flow dashboard. QuickBooks, Xero, or even a spreadsheet updated Monday morning.",
        });
    }

    if (!brief.finance.hasMonthlyClose) {
        score -= 20;
        findings.push({
            dimension: "finance",
            severity: "warn",
            title: "No monthly financial close",
            detail: "Without a monthly close, financial decisions are made on outdated data.",
            remediation: "Establish a monthly close checklist and complete it within 10 business days of month-end.",
        });
    }

    const burn = brief.finance.burnRateMonths;
    if (burn !== undefined && burn < 6) {
        score -= 25;
        findings.push({
            dimension: "finance",
            severity: "critical",
            title: `Low runway (${burn} months)`,
            detail: "Less than 6 months of runway creates existential pressure and limits strategic options.",
            remediation: "Prioritize revenue acceleration or raise a bridge within 60 days.",
        });
    }

    const growth = brief.finance.revenueGrowthPct;
    if (growth !== undefined && growth < 0) {
        score -= 20;
        findings.push({
            dimension: "finance",
            severity: "critical",
            title: "Negative revenue growth",
            detail: `Revenue declined ${Math.abs(growth)}% over 12 months. Root cause must be identified immediately.`,
            remediation: "Conduct a churn analysis and review pricing strategy within 30 days.",
        });
    }

    return {
        dimension: "finance",
        score: Math.max(0, score),
        weight: 1.5,
        grade: gradeFromScore(Math.max(0, score)),
        findings,
    };
}
