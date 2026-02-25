# Creative Strategist Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": ["string"],
  "recommended_next_step": "string",
  "risk_flags": ["string"],
  "payload": {
    "strategy_options": [
      {
        "name": "string",
        "audience": "string",
        "channel_plan": ["string"],
        "narrative_angle": "string",
        "execution_scope": ["string"]
      }
    ],
    "scoring_matrix": [
      {
        "option": "string",
        "strategic_fit": 0,
        "differentiation": 0,
        "feasibility": 0,
        "total": 0
      }
    ],
    "recommended_option": "string",
    "fallback_option": "string",
    "assumptions": ["string"]
  }
}
```
