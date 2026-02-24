# Knowledge Management Agent Failure Log

Record memory ingestion/retrieval failures with root cause and mitigation.

## Retry and Escalation

1. One retry allowed for transient write/read errors.
2. On second failure, return `blocked` with recovery steps.
3. If memory integrity is uncertain, force `needs_review`.
