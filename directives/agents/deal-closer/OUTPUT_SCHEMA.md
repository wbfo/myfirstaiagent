# Deal Closer Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "deal_package": {
      "offer": "string",
      "pricing_rationale": "string",
      "terms": ["string"],
      "objection_map": [{ "objection": "string", "response": "string" }],
      "close_plan": ["string"]
    }
  },
  "artifact_file": "string (optional)",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```
