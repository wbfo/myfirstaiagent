# Agent Dossiers

This directory organizes agent-specific operating files without changing runtime config behavior.

Runtime truth still lives in config files (`~/.openclaw/openclaw.json` and `openclaw.cloudrun.json`).
Specialist runtime bindings live in `execution/agent_runtime_map.json` and are invoked via
`execution/agent_runtime_dispatch.py`.

Shared specialist response baseline:
- `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`

Each agent dossier should contain:

1. `CHARTER.md`
2. `PERSONA.md`
3. `SOUL.md`
4. `HEARTBEAT.md`
5. `PLAYBOOK.md`
6. `TOOLS.md`
7. `SKILLS.md`
8. `OUTPUT_SCHEMA.md`
9. `SCORECARD.md`
10. `FAILURE_LOG.md`
11. `MEMORY_POLICY.md`
12. `ORCHESTRATOR_AGENT_MAP.md` (HoneyBadger only; routing truth table)

## Implemented dossiers

1. `directives/agents/honeybadger/`
2. `directives/agents/ops-coordinator/`
3. `directives/agents/quality-gate/`
4. `directives/agents/architect/`
5. `directives/agents/researcher/`
6. `directives/agents/deal-closer/`
7. `directives/agents/market-advisory/`
