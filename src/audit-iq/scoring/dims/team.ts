import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreTeam(brief: AuditBrief): DimensionScore {
  const findings: AuditFinding[] = [];
  let score = 100;

  if (brief.team.hasSinglePointOfFailure) {
    score -= 35;
    findings.push({
      dimension: "team",
      severity: "critical",
      title: "Single point of failure in team",
      detail: `Key person dependency: "${brief.team.keyPersonDependency ?? "unspecified"}". One departure halts operations.`,
      remediation:
        "Cross-train a backup for the critical role. Document their knowledge in an SOP within 14 days.",
    });
  }

  if (!brief.team.hasOrChart) {
    score -= 15;
    findings.push({
      dimension: "team",
      severity: "warn",
      title: "No org chart",
      detail: "Unclear accountability and reporting lines slow decisions and cause role overlap.",
      remediation:
        "Build a one-page org chart, even for a 3-person team. Include decision authority.",
    });
  }

  const culture = brief.team.cultureRating;
  if (culture !== undefined && culture <= 2) {
    score -= 20;
    findings.push({
      dimension: "team",
      severity: "critical",
      title: "Low culture health rating",
      detail: `Self-reported culture score of ${culture}/5. Low culture accelerates turnover and reduces output.`,
      remediation:
        "Conduct a 15-minute anonymous team survey. Address the top-rated issue within 30 days.",
    });
  }

  return {
    dimension: "team",
    score: Math.max(0, score),
    weight: 1.3,
    grade: gradeFromScore(Math.max(0, score)),
    findings,
  };
}
