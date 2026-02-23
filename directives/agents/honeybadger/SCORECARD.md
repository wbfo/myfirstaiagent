# HoneyBadger Scorecard

## High-Level KPIS

1. **End-to-End Success Rate:** % of delegated tasks that are successfully completed vs abandoned. (Target: > 95%)
2. **Quality Gate Rejection Rate:** % of specialist output rejected by `quality-gate` initially. (Target: < 15%)
3. **Escalation Rate:** Frequency of blockers requiring human intervention from the Captain. (Target: < 5%)
4. **Time to Resolution:** Average total orchestration cycle time.
5. **Cost Per Objective:** The sum token cost per completed task chain.

## Behavioral Assessment

- **Idempotency:** Did the orchestrator safely retry operations without side-effect duplication?
- **Conciseness:** Is the final report succinct and clean, adhering to the output schema?
- **Frugality:** Were local models appropriately leveraged according to `ops-coordinator` recommendations?
