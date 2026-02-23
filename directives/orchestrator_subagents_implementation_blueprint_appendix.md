## Rollout phases

### Phase 0 - Spec lock

1. Approve file blueprint and contracts.
2. Approve local model choice for support sub-agents.

Exit criteria:

- Captain approves this blueprint.

### Phase 1 - Skeleton

1. Create orchestrator and support sub-agent file packs.
2. Create stub execution scripts returning deterministic sample JSON.

Exit criteria:

- All files exist and validate basic schema.

### Phase 2 - Dry run (no side effects)

1. Run HoneyBadger with support sub-agents in advisory-only mode.
2. Test:

- Telegram incident triage flow
- Weekly war-room summary flow

Exit criteria:

- No action-routing regressions.
- Quality-gate catches schema/risk issues in test payloads.

### Phase 3 - Active support mode

1. Enable support sub-agents for default orchestration cycle.
2. Keep specialist agents unchanged.

Exit criteria:

- Stable for 7 days.
- No increase in incident rate.

Rollback triggers (any one triggers rollback to advisory-only mode):

1. Incident rate increases by >20% over baseline.
2. Telegram reply/file pipeline failure appears in two consecutive runs.
3. Sub-agent timeout/failure rate exceeds 15% over 24h.
4. Quality-gate false-block rate exceeds agreed threshold.

## Weekly meeting alignment

War Room remains 30 minutes:

1. KPI snapshot
2. Top 3 blockers/risks
3. Next 7-day decisions
4. Owners + deadlines

`execution/war_room_summary.py` should generate a concise markdown summary for archival.

## Observability requirements (required)

Each support sub-agent run must emit:

1. `task_id`
2. `subagent_id`
3. `task_type`
4. `model_id`
5. `started_at`, `ended_at`, `duration_ms`
6. `status`
7. `failure_reason` (if any)
8. `confidence`
9. `risk_flags_count`
10. `tokens_in`, `tokens_out`, `estimated_cost` (when available)

Store as structured JSONL for weekly aggregation.

## Config source-of-truth mapping

To prevent drift, map config by environment:

1. Local/dev runtime: `~/.openclaw/openclaw.json`
2. Cloud Run runtime: `/Users/abimbolaolaitan/Desktop/OPENopenclaw/openclaw_app/openclaw.cloudrun.json`
3. CI/deploy variables: workflow env in `.github/workflows/deploy-cloud-run.yml`

Any change to sub-agent model/tool policy must be applied consistently across all three layers.

## Guardrails

1. Support sub-agents cannot bypass HoneyBadger.
2. No direct external side effects from support sub-agents.
3. If support outputs conflict, HoneyBadger escalates to Captain.
4. Advisory market agent remains advisory-only.

## Acceptance checklist

1. Chain-of-command preserved exactly.
2. HoneyBadger gets local support for ops + quality.
3. Deterministic scripts backstop critical checks.
4. Weekly war-room output is generated consistently.
5. No regressions in Telegram reply/file pipeline.
