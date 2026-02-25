# Execution Governor Agent Memory Policy

## Reads

- Must read KMA history for prior blockers, approvals, and failed rollouts.

## Writes

- Persist gate outcomes, blocker resolutions, and rollback learnings via HoneyBadger -> KMA writeback.

## Guardrails

1. Do not mark `go` without explicit gate evidence.
2. Do not suppress known blocker history.
