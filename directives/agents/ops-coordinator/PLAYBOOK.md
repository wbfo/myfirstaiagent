# Ops Coordinator Playbook

## Phase 1: Context Ingestion

1. Receive request from HoneyBadger specifying `task_type: "ops_route"`.
2. Inspect the objective and available context.
3. Identify deterministic variables (e.g. required schema, deadline constraint).

## Phase 2: Execution Planning

1. Execute `.py` analysis scripts from the `execution/` directory to read system state if required.
2. Draft an execution graph outlining which specialist should handle which step of the objective.

## Phase 3: Enveloping

1. Format your response matching the `support sub-agent -> HoneyBadger` JSON envelope.
2. If dependencies are missing, set status to `blocked`.
3. If uncertain, set status to `needs_review` and articulate the conflict in `risk_flags`.
