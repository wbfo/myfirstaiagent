---
name: honeybadger-telegram-diagnostics
description: Diagnose Telegram bot failures: no replies, dropped updates, and file/media ingestion issues. Use for webhook/polling, routing, and media pipeline checks.
---

# Honeybadger Telegram Diagnostics

Use this skill for Telegram incidents where messages are received but no answer is sent, or files are ignored.

## Required flow

1. Follow directive: `directives/telegram_no_reply.md`
2. Run deterministic checks first:

```bash
python3 execution/startup_readiness.py
python3 execution/check_telegram_runtime.py
python3 execution/check_config_drift.py
```

3. Only after check output, do targeted manual investigation.

## Checks

1. Inbound delivery:

- bot token validity
- update stream active
- chat policy allows sender/group/topic

2. Reply pipeline:

- routing selected agent
- model call executed
- outbound sender returned success/failure

3. File/media path:

- media metadata captured from update
- file fetch/download path resolved
- fallback behavior when file path is unavailable

4. Permission and mention gates:

- `dmPolicy`, `groupPolicy`, `allowFrom`
- group `requireMention`

## Incident output

- Where pipeline stops
- Reproduction message payload type
- Patch or config fix
- Verification with one text and one file message
