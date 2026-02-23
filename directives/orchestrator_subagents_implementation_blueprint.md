# Orchestrator Sub-Agents Implementation Blueprint (Working Spec)

## Purpose

Concrete implementation plan for adding two **local-model support sub-agents** under HoneyBadger, while preserving chain of command:

1. Captain (human)  
2. HoneyBadger orchestrator  
3. All specialist agents

This is an internal working spec (not a database artifact).

## Current observed layout (as-is)

### Control and config

- Active runtime config: `~/.openclaw/openclaw.json`
- Current relevant defaults observed:
  - `agents.defaults.maxConcurrent = 4`
  - `agents.defaults.subagents.maxConcurrent = 8`
  - `agents.defaults.heartbeat.every = "30m"`

### Project structure currently used for orchestration

- Blueprint and SOPs: `directives/`
  - `directives/agent_blueprint.md`
  - `directives/telegram_no_reply.md`
  - `directives/cloudrun_deploy_and_rollback.md`
  - `directives/skills_governance.md`
- Deterministic checks: `execution/`
  - `execution/startup_readiness.py`
  - `execution/check_telegram_runtime.py`
  - `execution/check_config_drift.py`
- HoneyBadger skill suite: `skills/honeybadger-*`

### Important constraint

HoneyBadger is currently **config/skills driven**, not represented as a dedicated folder of persona/heartbeat files yet.  
This plan adds that structure cleanly without breaking current behavior.

## Objective

Add two local support sub-agents that assist HoneyBadger:

1. `ops-coordinator` (local model)
2. `quality-gate` (local model)

They are support-only (no final authority, no direct external side effects).

## Non-goals

1. No chain-of-command changes.
2. No autonomous trade execution.
3. No migration away from current orchestrator.

## Target design

### A) HoneyBadger remains decision point

- HoneyBadger delegates repetitive orchestration tasks to local support sub-agents.
- HoneyBadger validates outputs and decides action.
- Captain remains final authority on high-impact actions.

### B) Sub-agent responsibilities

#### `ops-coordinator` (local)

- Queue hygiene and task routing suggestions.
- Retry recommendation and timeout handling.
- Status rollups for active work items.

#### `quality-gate` (local)

- Output schema checks.
- Risk checklist checks before escalation.
- Confidence/uncertainty normalization.

## Required file blueprint (to create)

## 1) Orchestrator pack

Create:

- `directives/agents/honeybadger/CHARTER.md`
- `directives/agents/honeybadger/PERSONA.md`
- `directives/agents/honeybadger/SOUL.md`
- `directives/agents/honeybadger/HEARTBEAT.md`
- `directives/agents/honeybadger/PLAYBOOK.md`
- `directives/agents/honeybadger/TOOLS.md`
- `directives/agents/honeybadger/SKILLS.md`
- `directives/agents/honeybadger/OUTPUT_SCHEMA.md`
- `directives/agents/honeybadger/SCORECARD.md`
- `directives/agents/honeybadger/FAILURE_LOG.md`
- `directives/agents/honeybadger/MEMORY_POLICY.md`

## 2) Sub-agent packs

Create:

- `directives/agents/ops-coordinator/{CHARTER,PERSONA,SOUL,HEARTBEAT,PLAYBOOK,TOOLS,SKILLS,OUTPUT_SCHEMA,SCORECARD,FAILURE_LOG,MEMORY_POLICY}.md`
- `directives/agents/quality-gate/{CHARTER,PERSONA,SOUL,HEARTBEAT,PLAYBOOK,TOOLS,SKILLS,OUTPUT_SCHEMA,SCORECARD,FAILURE_LOG,MEMORY_POLICY}.md`

`PLAYBOOK.md` defines workflow sequence and decision points; `TOOLS.md` and `SKILLS.md` define capability boundaries and approved usage.

## 3) Deterministic execution tools for orchestrator support

Create:

- `execution/ops_task_router.py`
- `execution/quality_gate_check.py`
- `execution/war_room_summary.py`

All must return structured JSON and non-zero exit on critical failure.

## 4) Directive entrypoints

Create:

- `directives/orchestration_cycle.md`
- `directives/weekly_war_room.md`

## Config blueprint (planned changes)

Use OpenClaw sub-agent capabilities with explicit guardrails:

1. Keep sub-agent depth at `1` initially.
2. Keep `maxConcurrent` conservative for stability.
3. Set cheap/local default model for sub-agents.
4. Deny dangerous tool surfaces for sub-agents by default.

Implementation notes (to apply later):

- `agents.defaults.subagents.model`: local model id
- `agents.defaults.subagents.maxConcurrent`: start low (e.g., 2-4)
- `agents.defaults.subagents.maxSpawnDepth`: keep `1` for phase 1
- `tools.subagents.tools`: allowlist only required tools

### Local model runtime specification (required)

Define these explicitly before Phase 1:

1. Local provider/runtime (example: Ollama/LM Studio/local gateway).
2. Endpoint URL and health probe path.
3. Primary local model id for support sub-agents.
4. Fallback model order when local runtime is unavailable.
5. Degradation behavior:
  - If local runtime unhealthy: HoneyBadger continues without support sub-agents.
  - If fallback unavailable: mark task `blocked` and escalate.

Health gate must pass before support mode:

```bash
curl -sS <LOCAL_MODEL_HEALTH_URL>
```

## Tool and skill policy matrix (required)

Support sub-agents must use least privilege.

### `ops-coordinator`

- Allowed tools: status/read-only orchestration tools, session inspection, structured logging.
- Denied tools: message send, external write actions, code-modifying tools, financial/trading execution tools.
- Allowed skills: routing/status/checklist skills only.

### `quality-gate`

- Allowed tools: schema validation, read-only config/state inspection, report generation.
- Denied tools: any external action tools, deployment/change tools, write-side channel tools.
- Allowed skills: validation/risk/compliance skills only.

Policy rule: deny wins over allow.

## Integration contract

HoneyBadger -> support sub-agent request envelope:

```json
{
  "task_type": "ops_route|quality_check",
  "objective": "string",
  "input_payload": {},
  "deadline_s": 120,
  "required_schema": "schema_name"
}
```

Support sub-agent -> HoneyBadger response envelope:

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": [],
  "recommended_next_step": "string",
  "risk_flags": []
}
```

## Runtime reliability contract

### Timeouts

1. Default sub-agent deadline: 120s.
2. Hard timeout at 180s unless overridden per task type.

### Retry policy

1. Max retries: 2.
2. Backoff: exponential (`2s`, `6s`).
3. Retry only for transient failures (`timeout`, `temporary_unavailable`).
4. Do not retry on validation/policy failures.

### Idempotency

Every request must carry deterministic `task_id` generated by HoneyBadger:

```json
{
  "task_id": "hb-<timestamp>-<hash>"
}
```

If same `task_id` is seen again, sub-agent returns cached/latest result instead of duplicating work.

### Conflict handling

If `ops-coordinator` and `quality-gate` recommendations conflict:

1. HoneyBadger marks `needs_review`.
2. HoneyBadger escalates to Captain with both outputs.


## Appendix

Detailed rollout, observability, guardrails, and acceptance checklist moved to:

- `directives/orchestrator_subagents_implementation_blueprint_appendix.md`
