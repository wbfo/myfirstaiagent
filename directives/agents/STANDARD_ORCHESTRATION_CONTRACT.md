# Standard Orchestration Contract

## Purpose
Define one shared specialist contract so HoneyBadger can reliably parse, validate, and compose outputs across all agents.

## Required Top-Level Response Envelope

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": [],
  "payload": {}
}
```

Rules:
1. `status` is mandatory and must be one of `ok`, `needs_review`, or `blocked`.
2. `confidence` is a float from `0.0` to `1.0`.
3. `findings` and `risk_flags` are arrays of strings.
4. `recommended_next_step` is one concrete action.
5. Domain-specific content goes under `payload`.

## Optional Artifact Contract
For tasks expected to write files:

```json
{
  "artifact_file": "string",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```

Rules:
1. `artifact_file` is workspace-relative for the specialist session.
2. If file read fails (`ENOENT`), HoneyBadger continues with `artifact_preview` or `fallback_inline`.
3. Missing file is warning-level unless both file and fallback are absent.

## Retry and Escalation Baseline
1. Maximum one automatic retry per specialist task.
2. On second failure, return `blocked` and escalate with:
   - failure reason
   - what was attempted
   - recommended fallback path
