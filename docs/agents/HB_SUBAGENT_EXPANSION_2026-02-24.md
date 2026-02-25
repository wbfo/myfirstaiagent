# HoneyBadger Subagent Expansion (2026-02-24)

## Scope

Added six HoneyBadger-only subagents:

1. `knowledge-management`
2. `strategic-horizon-systems`
3. `operational-diagnostics-optimization`
4. `creative-director`
5. `creative-strategist`
6. `execution-governor`

## Runtime Mapping

Source of truth: `execution/agent_runtime_map.json`

- `knowledge-management` -> `nanobot`
- `strategic-horizon-systems` -> `zeroclaw`
- `operational-diagnostics-optimization` -> `nanobot`
- `creative-director` -> `zeroclaw`
- `creative-strategist` -> `zeroclaw`
- `execution-governor` -> `nanobot`

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
- `directives/agents/creative-strategist/`
- `directives/agents/execution-governor/`

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

## Runtime Installer Command

```bash
cd $APP_ROOT
./scripts/install-specialist-runtimes.sh $APP_ROOT
```

## Validation Commands

```bash
node openclaw.mjs agents list --json
node openclaw.mjs models status --json --agent knowledge-management
node openclaw.mjs models status --json --agent strategic-horizon-systems
node openclaw.mjs models status --json --agent operational-diagnostics-optimization
node openclaw.mjs models status --json --agent creative-director
node openclaw.mjs models status --json --agent creative-strategist
node openclaw.mjs models status --json --agent execution-governor
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

- Total live runtime agents: 14 (includes reserved non-default `main` alias on some builds)
- HoneyBadger-managed operational agents: 13
- HoneyBadger default orchestrator remains unchanged
- HoneyBadger `allowAgents` includes 12 subagents:
  - `knowledge-management`
  - `ops-coordinator`
  - `quality-gate`
  - `strategic-horizon-systems`
  - `operational-diagnostics-optimization`
  - `creative-director`
  - `creative-strategist`
  - `execution-governor`
  - `architect`
  - `researcher`
  - `deal-closer`
  - `market-advisory`

## Non-Regression Notes

- Existing specialist behavior remains in place.
- Legacy `main` runtime alias is non-default and treated as compatibility-only when deletion is blocked by runtime guard.
- Runtime map changes are additive for new specialist IDs.
