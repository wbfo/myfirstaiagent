# Execution Governor Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": ["string"],
  "recommended_next_step": "string",
  "risk_flags": ["string"],
  "payload": {
    "go_no_go": "go|no-go|conditional-go",
    "gate_matrix": [
      {
        "gate": "string",
        "status": "pass|at_risk|fail",
        "evidence": ["string"],
        "owner": "string"
      }
    ],
    "hard_blockers": ["string"],
    "soft_warnings": ["string"],
    "corrective_actions": ["string"],
    "rollback_triggers": ["string"]
  }
}
```
