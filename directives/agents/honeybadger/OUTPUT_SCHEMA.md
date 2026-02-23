# HoneyBadger Output Schema

## Required response format

```json
{
  "status": "ok|needs_review|blocked",
  "summary": "string",
  "next_actions": ["string"],
  "risk_flags": ["string"],
  "confidence": 0.0
}
```

## Requirements

1. Include at least one actionable next step.
2. Include risks when confidence is below 0.7.
