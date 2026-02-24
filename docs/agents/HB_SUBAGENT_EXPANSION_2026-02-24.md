# HoneyBadger Subagent Expansion (2026-02-24)

## Scope

Added four HoneyBadger-only subagents:

1. `knowledge-management`
2. `strategic-horizon-systems`
3. `operational-diagnostics-optimization`
4. `creative-director`

## Runtime Mapping

Source of truth: `execution/agent_runtime_map.json`

- `knowledge-management` -> `nanobot`
- `strategic-horizon-systems` -> `zeroclaw`
- `operational-diagnostics-optimization` -> `nanobot`
- `creative-director` -> `zeroclaw`

## HoneyBadger Delegation Policy

Source of truth: `directives/agents/honeybadger/ORCHESTRATOR_AGENT_MAP.md`

- All new agents are dispatchable only as HoneyBadger subagents.
- `knowledge-management` is mandatory:
  - pre-task recall context pack
  - post-task memory writeback delta

## Dossier Locations

- `directives/agents/knowledge-management/`
- `directives/agents/strategic-horizon-systems/`
- `directives/agents/operational-diagnostics-optimization/`
- `directives/agents/creative-director/`

Each contains:

- `CHARTER.md`
- `PERSONA.md`
- `SOUL.md`
- `HEARTBEAT.md`
- `PLAYBOOK.md`
- `TOOLS.md`
- `SKILLS.md`
- `OUTPUT_SCHEMA.md`
- `SCORECARD.md`
- `FAILURE_LOG.md`
- `MEMORY_POLICY.md`

## Runtime Sync Command

```bash
cd $APP_ROOT
./scripts/sync-honeybadger-agents.sh $APP_ROOT
```

## Validation Commands

```bash
node openclaw.mjs agents list --json
node openclaw.mjs models status --json --agent knowledge-management
node openclaw.mjs models status --json --agent strategic-horizon-systems
node openclaw.mjs models status --json --agent operational-diagnostics-optimization
node openclaw.mjs models status --json --agent creative-director
python3 execution/smoke_test_specialists.py
```

## Standardized Runtime Readiness Audit

Use this first for bot/AntiGravity audits to avoid source/shape mistakes:

```bash
./scripts/audit-hb-runtime-readiness.sh
```

Optional explicit root:

```bash
./scripts/audit-hb-runtime-readiness.sh /absolute/path/to/openclaw_app
```

This script enforces canonical sources:

- roster: `node openclaw.mjs agents list --json`
- HB allowlist: `node openclaw.mjs config get agents.list --json`
- runtime lineage: `execution/agent_runtime_map.json`
- smoke test: `python3 execution/smoke_test_specialists.py`

## Expected State

- Total live runtime agents: 12
- HoneyBadger default orchestrator remains unchanged
- HoneyBadger `allowAgents` includes 10 subagents:
  - `knowledge-management`
  - `ops-coordinator`
  - `quality-gate`
  - `strategic-horizon-systems`
  - `operational-diagnostics-optimization`
  - `creative-director`
  - `architect`
  - `researcher`
  - `deal-closer`
  - `market-advisory`

## Non-Regression Notes

- Existing 8-agent behavior remains in place.
- No existing agent IDs were renamed or removed.
- Runtime map changes are additive.
