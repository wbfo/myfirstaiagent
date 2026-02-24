# Knowledge Management Agent Heartbeat

1. Every 30 minutes: ingestion integrity check (missing writes, malformed events).
2. Daily: compaction check (event -> semantic summaries).
3. Daily: contradiction scan against pinned memory.
4. Weekly: recall quality report on critical facts.
