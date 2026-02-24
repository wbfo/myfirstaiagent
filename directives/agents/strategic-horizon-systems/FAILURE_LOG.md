# Strategic Horizon and Systems Agent Failure Log

Track failed strategic recommendations and corrected outcomes.

## Retry and Escalation

1. One retry allowed after assumption correction.
2. On second failure, return `blocked` with alternate route.
3. Always include known unknowns when confidence is low.
