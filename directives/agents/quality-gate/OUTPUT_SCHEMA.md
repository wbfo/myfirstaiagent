# Quality Gate Output Schema

## Required Envelope Format
You must respond with a strictly valid JSON object matching this schema. Prose will be rejected by the orchestrator.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [
    "Payload strictly matches ReportSchema.",
    "Trailing whitespace detected in paragraph 3."
  ],
  "recommended_next_step": "Approve and wrap final task string.",
  "risk_flags": [
    "Tone is slightly more conversational than requested by PLAYBOOK."
  ]
}
```

## Validation Constraints
1. **Status:** Must be exactly one of `ok`, `needs_review`, or `blocked`.
2. **Confidence:** A float between 0.0 and 1.0 indicating structural certainty.
3. **Recommended Next Step:** A single, executable action for HoneyBadger to take (e.g., "Reject back to researcher").
