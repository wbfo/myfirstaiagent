# HoneyBadger Failure Recovery Log

This protocol outlines how to handle faults across the orchestration pipeline.

## Error Handling Matrix

| Error Type                  | Cause                       | Primary Action                                | Escalation  |
|-----------------------------|-----------------------------|-----------------------------------------------|-------------|
| Timeout                     | Specialist agent hung       | Dispatch `ops-coordinator` to recommend retry  | On max retry|
| Quality Reject              | Output schema violation     | Send context back to specialist for revision  | On 2nd fail |
| Authorization Denied        | Lack of tool permissions    | Stop execution, do not retry.                 | Immediate   |
| Missing Local Model         | `gemma3:4b` unavailable     | Proceed without `ops-coordinator`.            | Log async   |
| Unresolvable Conflict       | Sub-agent mismatch          | Mark `needs_review`.                          | Immediate   |

## Logging Requirements
All critical failures from the execution scripts (e.g. `ops_task_router.py`) must be recorded cleanly into the session logs and immediately bubbled up to the final status report for the Captain.
