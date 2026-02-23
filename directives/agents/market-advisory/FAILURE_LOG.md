# Market Advisory Failure Log

Record:

1. Weak thesis signals
2. Missing risk context
3. Broken invalidation logic

## Retry and Escalation
1. Maximum one automatic retry for transient runtime errors.
2. If confidence remains low, set `status=needs_review` and recommend defer/no-go.
3. If advisory payload cannot be produced safely, set `status=blocked`.
