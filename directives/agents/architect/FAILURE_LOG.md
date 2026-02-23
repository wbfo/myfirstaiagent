# Architect Failure Log

Record architectural regressions, root causes, and remediation.

## Retry and Escalation

1. Maximum one automatic retry on transient runtime errors.
2. On second failure, return `status=blocked` with:
   - failure reason
   - attempted recovery
   - one fallback recommendation for HoneyBadger.
