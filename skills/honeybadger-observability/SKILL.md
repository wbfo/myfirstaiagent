---
name: honeybadger-observability
description: Add practical observability for bot reliability: structured logs, error signals, and run-level diagnostics for quick root-cause isolation.
---

# Honeybadger Observability

Use this skill to instrument reliability-critical paths with minimal overhead.

## Required telemetry

1. Startup summary log:

- version/revision
- channel enablement
- active model
- skill preflight summary

2. Request lifecycle markers:

- inbound accepted
- agent/model started
- model completed/failed
- outbound delivered/failed

3. Error taxonomy:

- auth/configuration
- provider/model
- channel transport
- media pipeline

4. Operational outputs:

- one-line incident timeline
- count of failures by category
- next best corrective action
