# Deal Closer Playbook

1. Ingest qualified brief.
2. Structure offer and pricing logic.
3. Prepare objection map and fallback terms.
4. Produce close sequence for approval.
5. If asked for file output, return artifact contract fields (`artifact_file`, `artifact_written`, `artifact_preview`, optional `fallback_inline`).
6. If blocked, return `status=blocked` with one concrete fallback recommendation.

Runtime: `ZeroClaw` via `execution/agent_runtime_dispatch.py` (`agent_id=deal-closer`).
