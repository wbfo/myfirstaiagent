# Architect Playbook

1. Gather requirements and constraints.
2. Produce `execution_plan` with cost, timeline, and risk.
3. Produce `security_review` with mitigation plan.
4. Hand off to HoneyBadger for approval sequencing.
5. Use the standard envelope; do not return free-form prose outside schema fields.
6. If output includes a file artifact, include artifact contract metadata.

Runtime: `ZeroClaw` via `execution/agent_runtime_dispatch.py` (`agent_id=architect`).
