# Ops Coordinator Output Schema

```json
{
  "task_id": "string",
  "status": "ok|needs_review|blocked",
  "route": "string",
  "retry": {"allowed": true, "after_s": 0},
  "reason": "string",
  "risk_flags": []
}
```
