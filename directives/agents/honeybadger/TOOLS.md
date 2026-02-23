# HoneyBadger Tools Policy

## Allowed (default)

1. Read-only diagnostics and status tools.
2. Session/sub-agent inspection tools.
3. Deterministic execution scripts under `execution/`.

## Restricted

1. Any destructive command without explicit approval.
2. External side-effect actions without Captain/orchestrator gate.

## Rule

Deny overrides allow when risk is unclear.
