# Ops Coordinator Output Schema

## Required Envelope Format
You must respond with a strictly valid JSON object matching this schema. Prose will be rejected by the orchestrator.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [
    "Identified task dependency: API documentation required.",
    "Target system state is green."
  ],
  "recommended_next_step": "Dispatch 'researcher' to fetch API documentation before sending task to 'architect'.",
  "risk_flags": [
    "Rate limits on target service currently at 90%."
  ]
}
```

## Validation Constraints
1. **Status:** Must be exactly one of `ok`, `needs_review`, or `blocked`.
2. **Confidence:** A float between 0.0 and 1.0 indicating certainty of the routing path.
3. **Recommended Next Step:** A single, executable action for HoneyBadger to take.
