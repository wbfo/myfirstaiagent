import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreMarketing(brief: AuditBrief): DimensionScore {
  const findings: AuditFinding[] = [];
  let score = 100;

  if (!brief.marketing.hasIcp) {
    score -= 30;
    findings.push({
      dimension: "marketing",
      severity: "critical",
      title: "No defined Ideal Customer Profile",
      detail:
        "Without an ICP, every sales and marketing dollar is partially wasted on the wrong audience.",
      remediation:
        "Define your ICP this week: company size, industry, pain point, budget, and decision-maker title.",
    });
  }

  if (!brief.marketing.hasRepeatableAcquisition) {
    score -= 25;
    findings.push({
      dimension: "marketing",
      severity: "critical",
      title: "No repeatable customer acquisition",
      detail: "Revenue is personality-dependent. You cannot scale what you cannot repeat.",
      remediation:
        "Document your current best-performing channel and build a 5-step repeatable playbook around it.",
    });
  }

  const cvr = brief.marketing.conversionRatePct;
  if (cvr !== undefined && cvr < 2) {
    score -= 15;
    findings.push({
      dimension: "marketing",
      severity: "warn",
      title: `Low conversion rate (${cvr}%)`,
      detail: "Sub-2% conversion suggests a messaging, targeting, or trust gap.",
      remediation: "A/B test your core CTA and offer structure. Test social proof placement.",
    });
  }

  const brand = brief.marketing.brandStrength;
  if (brand === "none") {
    score -= 10;
    findings.push({
      dimension: "marketing",
      severity: "info",
      title: "No brand presence",
      detail:
        "Unknown brands require more outreach effort per close. Brand investment compounds over time.",
    });
  }

  return {
    dimension: "marketing",
    score: Math.max(0, score),
    weight: 1.1,
    grade: gradeFromScore(Math.max(0, score)),
    findings,
  };
}
