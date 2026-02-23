---
name: honeybadger-cloudrun-ops
description: Deploy, verify, and rollback OpenClaw on Google Cloud Run. Use for broken deploys, no-reply incidents, runtime env drift, and release hardening.
---

# Honeybadger Cloud Run Ops

Use this skill when the bot is deployed on Cloud Run and behavior diverges from local.

## Workflow

1. Validate runtime inputs:

- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_GATEWAY_PORT`
- model API keys and provider env vars
- Telegram bot token and channel settings

2. Confirm service health:

- startup logs
- first inbound update log
- first outbound reply log

3. Validate deploy settings:

- min instances
- CPU throttling setting
- ingress/auth mode
- revision env var diff vs last good revision

4. Rollback policy:

- rollback immediately on confirmed regression
- preserve failing revision logs before rollback
- record root cause and patch target

## Output format

- Failure mode
- Confirmed root cause
- Exact fix
- Validation checks
- Rollback decision
