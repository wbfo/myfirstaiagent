# Deal Closer Failure Log

Record:

1. Lost deal root causes
2. Margin erosion causes
3. Misqualification patterns

## Retry and Escalation

1. Maximum one automatic retry for transient runtime/output issues.
2. If required artifact file is missing, include `fallback_inline` and set `status=needs_review`.
3. If both artifact and fallback are unavailable, set `status=blocked` with explicit next action.
