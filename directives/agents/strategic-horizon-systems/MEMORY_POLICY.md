# Strategic Horizon and Systems Agent Memory Policy

## Reads

- Must read KMA context pack before producing plans.

## Writes

- Persist strategy decisions, assumptions, and kill criteria through HoneyBadger -> KMA writeback.

## Guardrails

1. Never produce a strategy that conflicts with pinned constraints without explicit `needs_review`.
2. Mark assumptions clearly for future recall audits.
