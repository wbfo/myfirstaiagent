# Researcher Failure Log

Record:

1. Weak evidence conclusions
2. Missed key signals
3. Overconfident forecasts

## Retry and Escalation
1. Maximum one automatic retry for transient fetch/runtime issues.
2. If evidence quality remains insufficient after retry, set `status=needs_review`.
3. If task cannot be completed, set `status=blocked` and include a concrete context/data request.
