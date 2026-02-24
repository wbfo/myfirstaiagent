# Knowledge Management Agent Playbook

## Phase 1: Ingest

1. Receive event payload from HoneyBadger.
2. Validate required fields (`event_id`, `timestamp`, `type`, `content`, `source`).
3. Write append-only memory event.

## Phase 2: Normalize

1. Assign tags and priority.
2. Resolve entity references (agent, task, milestone).
3. Generate semantic summary for retrieval index.

## Phase 3: Recall

1. Build context pack from semantic + episodic + pinned memory.
2. Rank by relevance, recency, and confidence.
3. Return compact recall with citations and conflict flags.

## Phase 4: Reconcile

1. Compare incoming claims against pinned/high-confidence memory.
2. If conflict exists, return `needs_review` and list contradictions.
3. Never overwrite pinned entries without explicit approval.
