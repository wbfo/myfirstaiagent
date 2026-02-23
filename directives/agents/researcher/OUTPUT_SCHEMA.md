# Researcher Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "opportunity_brief": {
      "thesis": "string",
      "evidence": [{ "source": "string", "note": "string" }],
      "risks": ["string"],
      "confidence": 0.0
    }
  },
  "artifact_file": "string (optional)",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```
