# HoneyBadger Playbook

## Phase -1: Intent Normalization

1. Normalize natural Captain requests into executable intents.
2. Map any of:
   - "audit base code", "audit project", "audit everything", "run audit"
     to intent: `FULL_PROJECT_AUDIT`.
3. `FULL_PROJECT_AUDIT` always implies whole-workspace scope unless Captain explicitly narrows scope.

## Phase 0: Audit Baseline (default before planning)

1. Build current-state baseline using:
   - directives + runtime config + execution scripts
   - repository structure and recent git history
2. If Captain requested an audit, execute `AUDIT_MODE.md` fully before delegation.
3. Produce a short internal map:
   - known facts
   - assumptions
   - top risks
   - likely high-impact improvements

## Phase 0.5: Memory Sync (mandatory)

1. Dispatch `knowledge-management` for a pre-task memory context pack.
2. Use context pack facts and constraints as first-class planning input.
3. If memory conflicts are flagged, mark `needs_review` before dispatching deep work.

## Phase 1: Ingestion & Triaging

1. Read the objective and `task.md`.
2. Merge objective context with `knowledge-management` context pack.
3. Determine if the objective is executable with current context.
4. If not executable: attempt one assumption-driven path first.
5. Only if still blocked, draft focused questions for Captain and mark task blocked.
6. If executable: Break into discrete sub-tasks.

## Phase 2: Execution Routing (Ops Support)

1. Pass the sub-task list to `ops-coordinator`.
2. `ops-coordinator` generates an execution graph and queues tasks.
3. Wait for `ops-coordinator` to recommend dispatch.

## Phase 3: Specialist Dispatch

1. Dispatch specific tasks to one or more of:
   - `strategic-horizon-systems`
   - `operational-diagnostics-optimization`
   - `creative-director`
   - `architect`
   - `researcher`
   - `deal-closer`
   - `market-advisory`
2. For each dispatch, set a deterministic `artifact_contract`:
   - `artifact_file`: required target filename (example: `deal_closer_report.txt`)
   - `fallback_inline`: true
   - `required_confirmation`: true
3. Require specialist completion response to include:
   - `status`
   - `artifact_file`
   - `artifact_written` (true|false)
   - `artifact_preview` (first line or short summary)
4. Apply timeouts and retry policies defined in the blueprint if they hang.
5. Do not do blind retry loops:
   - max one automatic retry per specialist task
   - if second attempt fails, escalate with `blocked` + failure reason + fallback plan

## Phase 4: Quality Gate

1. Validate specialist artifact retrieval before quality checks:
   - attempt read of `artifact_file`
   - if read succeeds: continue
   - if read fails with `ENOENT`: do not fail orchestration immediately
2. On `ENOENT`, invoke fallback policy:
   - if specialist returned `artifact_preview` or inline content, continue with that content
   - mark run state `needs_review` and include warning in final report
   - optionally request specialist re-write artifact once
   - if still missing, fetch latest specialist session summary/history and continue with that payload
3. Pass generated artifacts or fallback content to `quality-gate`.
4. `quality-gate` checks against `OUTPUT_SCHEMA` and identifies structural risks.
5. If `quality-gate` rejects, send back to specialist with rejection reasoning.
6. If `quality-gate` approves, aggregate into final report.

## Phase 5: Completion

1. Update `task.md`.
2. Provide a single, concise summary of actions taken and artifacts generated to the Captain.
3. Always include an artifact table in completion output:
   - expected artifact path
   - read status (`ok` or `missing`)
   - fallback used (`yes` or `no`)
4. Dispatch `knowledge-management` with a memory delta containing:
   - decisions made
   - constraints updated
   - tasks created/closed
   - risks discovered
