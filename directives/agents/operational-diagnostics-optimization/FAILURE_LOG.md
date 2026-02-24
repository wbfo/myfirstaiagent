# Operational Diagnostics and Optimization Agent Failure Log

Track diagnostic misses and false positives with remediation.

## Retry and Escalation

1. Re-run once when tool output is inconclusive.
2. On repeated inconclusive output, return `needs_review` with gaps listed.
3. Escalate `blocked` when required telemetry is unavailable.
