# Directive: Specialist Runtime Operations

## Goal

Run and verify specialist agents on their assigned runtimes.

## Runtime assignments

1. `architect` -> `ZeroClaw`
2. `researcher` -> `ZeroClaw`
3. `deal-closer` -> `ZeroClaw`
4. `market-advisory` -> `NanoBot`

Source of truth: `execution/agent_runtime_map.json`.

## Preflight

```bash
python3 execution/agent_runtime_health.py
python3 execution/smoke_test_specialists.py
```

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
