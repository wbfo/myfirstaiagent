# Operational Diagnostics and Optimization Agent Memory Policy

## Reads

- Must read KMA entries for open incidents, historical fixes, and known bottlenecks.

## Writes

- Persist confirmed root causes, validated fixes, and recurring failure signatures through HoneyBadger -> KMA writeback.

## Guardrails

1. Do not record unverified causes as facts.
2. Mark provisional findings with low confidence until verified.
