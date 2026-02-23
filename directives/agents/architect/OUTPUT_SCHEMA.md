# Architect Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "execution_plan": {
      "objective": "string",
      "architecture": "string",
      "dependencies": ["string"],
      "timeline": "string",
      "cost_estimate": "string"
    },
    "security_review": {
      "risks": ["string"],
      "mitigations": ["string"],
      "residual_risk": "low|medium|high"
    }
  },
  "artifact_file": "string (optional)",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```
