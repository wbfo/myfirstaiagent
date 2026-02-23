import type { AuditBrief, AuditFinding, DimensionScore } from "../../types.js";
import { gradeFromScore } from "../../types.js";

export function scoreRisk(brief: AuditBrief): DimensionScore {
  const findings: AuditFinding[] = [];
  let score = 100;

  if (!brief.risk.hasContractTemplates) {
    score -= 25;
    findings.push({
      dimension: "risk",
      severity: "critical",
      title: "No contract templates",
      detail:
        "Every engagement without a contract is a liability. One dispute can cost more than a year of revenue.",
      remediation:
        "Get a standard MSA and SOW template reviewed by a lawyer. Use it for every client starting now.",
    });
  }

  if (!brief.risk.hasInsurance) {
    score -= 20;
    findings.push({
      dimension: "risk",
      severity: "warn",
      title: "No business insurance",
      detail:
        "Professional liability and general liability gaps expose personal assets to business risk.",
      remediation:
        "Get a quote for E&O and GL insurance within two weeks. Cost is typically $500–$2,000/year.",
    });
  }

  if (!brief.risk.hasComplianceReview) {
    score -= 15;
    findings.push({
      dimension: "risk",
      severity: "warn",
      title: "No compliance review conducted",
      detail:
        "Depending on industry, GDPR, HIPAA, SOC2, or state-level requirements may already apply.",
      remediation:
        "Conduct a 1-hour compliance review with a consultant. Know which frameworks apply before they're enforced.",
    });
  }

  if (brief.risk.topExistentialRisk) {
    findings.push({
      dimension: "risk",
      severity: "info",
      title: "Self-identified existential risk",
      detail: `Owner-flagged risk: "${brief.risk.topExistentialRisk}". This should be at the top of the board agenda.`,
    });
  }

  return {
    dimension: "risk",
    score: Math.max(0, score),
    weight: 1.4,
    grade: gradeFromScore(Math.max(0, score)),
    findings,
  };
}
