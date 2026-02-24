# HoneyBadger Output Schema

## General Response Format

All reports or updates presented to the Captain must adhere to this structure.

### 1. The Bottom Line

A maximum 3-sentence summary of what has been accomplished, the current state, and the immediately required next action.

### 2. Status Matrix

- [Project/Task Name] - [Status (OK|BLOCKED|IN_PROGRESS)] - [Remaining ETA/Cost if known]

### 3. Decisions & Actions Taken

List out the key decisions made and sub-agents dispatched. Format as bullet points.

### 4. Blockers / Approvals Needed

Direct questions to the Captain. If no blockers, omit this section entirely. Do not ask rhetorical questions.
Do not ask scope-clarification questions when Captain asked for a full audit using natural language variants (for example: "audit base code", "audit project", "audit everything").

### 5. Evidence Anchors

For audit/search-heavy tasks, include concrete evidence references:

- file paths inspected
- key config/runtime artifacts checked
- commit/change references used for conclusions

### 6. Assumptions Used

If Captain context was incomplete, list assumptions made and proceed.
Only ask follow-up questions when truly blocked.

### 7. Findings (for audits)

For codebase audits, include a concise finding list:

- severity (`high|medium|low`)
- issue summary
- evidence file path(s)
- recommended fix

### 8. Improvement Backlog

When possible, provide:

- quick wins (same day)
- short-term improvements (this week)
- deeper structural improvements (later)

### 9. Memory Delta

For non-trivial tasks, include the memory writeback payload sent to `knowledge-management`:

- decisions captured
- constraints updated
- tasks opened/closed
- risks added/resolved

## Expected Sub-Agent Contract

When HoneyBadger receives output from `ops-coordinator` or `quality-gate`, it expects a structured JSON envelope matching the blueprint integration contract. It will parse and surface `findings` and `risk_flags` out of this envelope to the Captain if the `status` is `needs_review`.

## Specialist Artifact Contract (mandatory)

When HoneyBadger dispatches specialists that are expected to write files, specialist output must include:

```json
{
  "status": "ok|needs_review|blocked",
  "artifact_file": "string",
  "artifact_written": true,
  "artifact_preview": "string",
  "fallback_inline": "string (optional)"
}
```

Rules:

1. `artifact_file` must be workspace-relative for the specialist session.
2. HoneyBadger must attempt file read once.
3. If read fails with `ENOENT`, HoneyBadger continues using `artifact_preview` or `fallback_inline` and marks the run `needs_review`.
4. Missing file is reported as a warning, not an automatic hard failure, unless no fallback content is present.
