# Execution Governor Agent Failure Log

Record misclassified gates, missed blockers, and bad go/no-go calls.

## Retry and Escalation

1. Re-check once when gate evidence is incomplete.
2. If still unclear, return `needs_review` with missing evidence list.
3. Escalate `blocked` when no safe execution path exists.
