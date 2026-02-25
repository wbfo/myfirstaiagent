# Creative Strategist Agent Failure Log

Record rejected strategies, missing-evidence cases, and unclear recommendations.

## Retry and Escalation

1. One refinement pass allowed after rejection.
2. If still ambiguous, return `needs_review` with required inputs.
3. Escalate `blocked` when objective lacks minimum constraints.
