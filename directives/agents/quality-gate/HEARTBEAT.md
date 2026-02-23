# Quality Gate Heartbeat

**Cadence:** On-demand only.
**Trigger:** Triggered specifically by the HoneyBadger orchestrator passing a `quality_check` event.
**Reporting:** Sub-agent json envelope.

## Cadence Rules
1. You do not wake up autonomously.
2. You only operate on the specific payload and required schema handed to you by HoneyBadger.
3. You must execute and return validation answers within `120s`. 
