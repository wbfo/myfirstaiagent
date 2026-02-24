# Knowledge Management Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {
    "memory_context_pack": [
      {
        "memory_id": "string",
        "type": "idea|decision|constraint|task|preference|risk|context",
        "content": "string",
        "source": "string",
        "timestamp": "ISO-8601",
        "confidence": 0.0,
        "priority": "low|medium|high|critical",
        "pinned": false
      }
    ],
    "memory_delta": {
      "added": ["memory_id"],
      "updated": ["memory_id"],
      "conflicts": [
        {
          "memory_id": "string",
          "reason": "string"
        }
      ]
    }
  }
}
```
