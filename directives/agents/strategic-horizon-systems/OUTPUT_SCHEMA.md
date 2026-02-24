# Strategic Horizon and Systems Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "assumptions": ["string"],
    "constraints": ["string"],
    "scenario_matrix": {
      "best": "string",
      "base": "string",
      "worst": "string"
    },
    "timeline_plan": {
      "d30": ["string"],
      "d90": ["string"],
      "d180": ["string"]
    },
    "dependencies": ["string"],
    "trigger_thresholds": ["string"],
    "kill_criteria": ["string"],
    "rollback_options": ["string"]
  }
}
```
