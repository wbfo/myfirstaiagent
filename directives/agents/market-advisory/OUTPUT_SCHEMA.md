# Market Advisory Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "signal": {
      "asset": "string",
      "timeframe": "string",
      "thesis": "string",
      "evidence": ["string"],
      "confidence": 0.0,
      "risk_notes": ["string"],
      "invalidation": "string"
    },
    "advisory_only": true
  },
  "artifact_file": "string (optional)",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```
