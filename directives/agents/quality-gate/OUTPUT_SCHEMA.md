# Quality Gate Output Schema

```json
{
  "task_id": "string",
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "checks": [{"name": "string", "passed": true, "note": "string"}],
  "risk_flags": ["string"],
  "remediation": ["string"]
}
```
