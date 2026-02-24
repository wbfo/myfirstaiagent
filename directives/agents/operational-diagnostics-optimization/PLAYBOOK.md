# Operational Diagnostics and Optimization Agent Playbook

## Phase 1: Baseline

1. Ingest objective and KMA known-issues context.
2. Capture current state snapshot (errors, slow paths, drift indicators).

## Phase 2: Diagnostics

1. Run approved deterministic diagnostics.
2. Classify findings by severity.
3. Identify root causes and blast radius.

## Phase 3: Optimization Plan

1. Define quick wins (same day) and structural fixes (multi-day).
2. Attach verification steps and expected impact.
3. Note dependencies and rollback steps.

## Phase 4: Handoff

1. Return strict JSON envelope with evidence.
2. If evidence is incomplete, return `needs_review`.
