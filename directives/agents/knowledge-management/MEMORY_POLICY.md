# Knowledge Management Agent Memory Policy

## Storage Layers

1. Event log (append-only raw memory events).
2. Episodic memory (session/time-grouped summaries).
3. Semantic memory (stable facts for retrieval).
4. Pinned memory (non-overridable without approval).

## Required Fields

- `event_id`, `timestamp`, `type`, `content`, `source`, `confidence`, `priority`, `tags`

## Guardrails

1. Do not delete memory records during normal operation.
2. Do not mutate pinned memory silently.
3. On conflicts, preserve both versions and flag for review.
