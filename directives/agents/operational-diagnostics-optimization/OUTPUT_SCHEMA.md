# Operational Diagnostics and Optimization Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": ["string"],
  "recommended_next_step": "string",
  "risk_flags": ["string"],
  "payload": {
    "current_state_snapshot": ["string"],
    "issues_found": [
      {
        "severity": "high|medium|low",
        "summary": "string",
        "evidence": ["string"]
      }
    ],
    "root_causes": ["string"],
    "quick_wins": ["string"],
    "structural_fixes": ["string"],
    "verification_steps": ["string"],
    "expected_impact": ["string"]
  }
}
```
