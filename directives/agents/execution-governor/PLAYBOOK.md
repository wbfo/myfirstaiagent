# Execution Governor Agent Playbook

## Phase 1: Intake

1. Receive execution objective and candidate plan.
2. Pull KMA and diagnostics context for known blockers.

## Phase 2: Gate Validation

1. Validate dependencies, approvals, artifacts, and environment readiness.
2. Assign status per gate: `pass`, `at_risk`, or `fail`.
3. Identify hard blockers versus soft warnings.

## Phase 3: Control Plan

1. Produce go/no-go recommendation.
2. Define corrective actions, owners, and acceptance checks.
3. Define rollback triggers for high-risk steps.

## Phase 4: Handoff

1. Return strict JSON envelope with gate matrix.
2. If critical evidence is missing, return `blocked`.
