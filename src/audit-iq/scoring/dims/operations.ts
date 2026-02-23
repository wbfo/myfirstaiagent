import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreOperations(brief: AuditBrief): DimensionScore {
  const findings: AuditFinding[] = [];
  let score = 100;

  if (!brief.operations.hasDocumentedProcesses) {
    score -= 30;
    findings.push({
      dimension: "operations",
      severity: "critical",
      title: "No documented processes",
      detail:
        "Key operations rely on tribal knowledge. One departure disrupts the entire workflow.",
      remediation: "Document the top 3 recurring processes in a shared SOP library within 30 days.",
    });
  }

  if (!brief.operations.hasAutomation) {
    score -= 20;
    findings.push({
      dimension: "operations",
      severity: "warn",
      title: "No automation in place",
      detail: "Manual execution at scale creates compounding errors and limits growth.",
      remediation:
        "Identify 1–2 high-frequency manual tasks and automate them with Zapier, Make, or custom scripts.",
    });
  }

  const cycleTime = brief.operations.avgCycleTimeDays;
  if (cycleTime && cycleTime > 14) {
    score -= 15;
    findings.push({
      dimension: "operations",
      severity: "warn",
      title: `High cycle time (${cycleTime} days)`,
      detail: "Slow throughput limits revenue velocity and client satisfaction.",
      remediation: "Map the cycle and identify the longest wait step. Target a 30% reduction.",
    });
  }

  if (brief.operations.primaryBottleneck) {
    findings.push({
      dimension: "operations",
      severity: "info",
      title: "Known bottleneck identified",
      detail: `Self-reported bottleneck: "${brief.operations.primaryBottleneck}". Awareness is the first step.`,
    });
  }

  return {
    dimension: "operations",
    score: Math.max(0, score),
    weight: 1.2,
    grade: gradeFromScore(Math.max(0, score)),
    findings,
  };
}
