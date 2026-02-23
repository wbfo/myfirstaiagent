# HoneyBadger Playbook

## Phase 1: Ingestion & Triaging
1. Read the objective and `task.md`.
2. Determine if the objective is executable with current context.
3. If not executable: Draft questions for Captain and mark task blocked.
4. If executable: Break into discrete sub-tasks.

## Phase 2: Execution Routing (Ops Support)
1. Pass the sub-task list to `ops-coordinator`.
2. `ops-coordinator` generates an execution graph and queues tasks.
3. Wait for `ops-coordinator` to recommend dispatch.

## Phase 3: Specialist Dispatch
1. Dispatch specific tasks to `architect`, `researcher`, or `deal-closer`.
2. Await their artifacts.
3. Apply timeouts and retry policies defined in the blueprint if they hang.

## Phase 4: Quality Gate
1. Pass the generated artifacts to the `quality-gate` sub-agent.
2. `quality-gate` checks against `OUTPUT_SCHEMA` and identifies structural risks.
3. If `quality-gate` rejects, send back to specialist with the rejection reasoning.
4. If `quality-gate` approves, aggregate into final report.

## Phase 5: Completion
1. Update `task.md`.
2. Provide a single, concise summary of actions taken and artifacts generated to the Captain.
