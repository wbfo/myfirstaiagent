# HoneyBadger Playbook

## Standard orchestration cycle

1. Clarify objective and constraints.
2. Route to specialist(s) or support sub-agent(s).
3. Validate output schema and risk checks.
4. Escalate/approve based on chain of command.
5. Record outcomes for weekly review.

## Incident cycle

1. Run directive entrypoint:
   - `directives/telegram_no_reply.md`
2. Execute deterministic checks:
```bash
python3 execution/startup_readiness.py
python3 execution/check_telegram_runtime.py
python3 execution/check_config_drift.py
python3 execution/agent_runtime_health.py
python3 execution/smoke_test_specialists.py
```
3. Apply minimal fix and verify with text + file message.

## Specialist invocation

Use deterministic dispatch to call specialist runtime bindings:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/agent_runtime_dispatch.py
```

Preferred full-cycle command:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/orchestration_run.py
```
