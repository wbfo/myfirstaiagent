# Directive: Orchestration Cycle

## Goal

Run a deterministic orchestration pass with support sub-agents before specialist execution.

## Steps

0. Preferred one-command cycle:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/orchestration_run.py
```

1. Build a task envelope with `task_id`, `task_type`, objective, and deadline.
2. Route task:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/ops_task_router.py
```

3. Validate output against expected schema:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/quality_gate_check.py
```

4. If status is `blocked`, escalate to HoneyBadger then Captain.
5. If status is `needs_review`, include remediation notes and re-run once.
6. If status is `ok`, invoke runtime dispatch for the assigned specialist:

```bash
echo '<JSON_PAYLOAD>' | python3 execution/agent_runtime_dispatch.py
```

7. Validate specialist output with `execution/quality_gate_check.py` before approval/escalation.

## Output

- Routing decision
- Gate status
- Next action and owner
