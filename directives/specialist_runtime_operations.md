# Directive: Specialist Runtime Operations

## Goal

Run and verify specialist agents on their assigned runtimes.

## Runtime assignments

1. `knowledge-management` -> `NanoBot`
2. `strategic-horizon-systems` -> `ZeroClaw`
3. `operational-diagnostics-optimization` -> `NanoBot`
4. `creative-director` -> `ZeroClaw`
5. `creative-strategist` -> `ZeroClaw`
6. `execution-governor` -> `NanoBot`
7. `architect` -> `ZeroClaw`
8. `researcher` -> `ZeroClaw`
9. `deal-closer` -> `ZeroClaw`
10. `market-advisory` -> `NanoBot`

Source of truth: `execution/agent_runtime_map.json`.

Live chat note: this runtime map is used by `execution/*.py` dispatch scripts. It does not
automatically override the model/runtime used by live Telegram/webchat sessions.
Run `./scripts/sync-honeybadger-agents.sh` to align live agent model routing with this plan.

## Preflight

```bash
./scripts/install-specialist-runtimes.sh
python3 execution/agent_runtime_health.py
python3 execution/smoke_test_specialists.py
```

Runtime source repos:

1. `zeroclaw`: `https://github.com/zeroclaw-labs/zeroclaw.git`
2. `NanoBot`: `https://github.com/HKUDS/NanoBot.git`

## Single specialist dispatch

```bash
echo '{
  "task_id": "hb-001",
  "agent_id": "architect",
  "objective": "Design a secure Telegram ingestion flow.",
  "context": {"priority": "high"},
  "deadline_s": 120
}' | python3 execution/agent_runtime_dispatch.py
```

## Full cycle (route -> dispatch -> quality gate)

```bash
echo '{
  "task_id": "hb-002",
  "task_type": "design_change",
  "objective": "Harden Telegram ingestion + file handling.",
  "context": {"priority": "high"},
  "deadline_s": 120,
  "dry_run": true,
  "confidence": 0.7
}' | python3 execution/orchestration_run.py
```

## Notes

1. Use `--dry-run` to verify wiring without model/API calls.
2. Use `smoke_test_specialists.py --live` only when API credentials are set.
3. Required env for current map:
   - `OPENROUTER_API_KEY` for ZeroClaw specialists.
   - At least one model key (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `GEMINI_API_KEY`) for NanoBot.
4. If runtime check fails, HoneyBadger must mark task `blocked` and escalate.
