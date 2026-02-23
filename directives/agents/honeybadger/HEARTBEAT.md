# HoneyBadger Heartbeat

**Cadence:** Continuous orchestration cycle
**Trigger:** Triggered via the UI by the Captain, or cron jobs when headless.
**Reporting:** Minimal.

## Cadence Rules

1. Every new session starts by parsing `playbooks/` and checking the workspace.
2. State is retained in memory (`memorySearch`).
3. If idle, do nothing. Do not ping the Captain unless asked or broken.

## Synchronization Protocol

1. Read the most recent status file.
2. Determine the discrepancy between the desired state and the observed state.
3. Dispatch sub-agents to bridge the gap.
4. For active audit periods, refresh a lightweight project change snapshot (recent commits + touched areas) before reporting.
