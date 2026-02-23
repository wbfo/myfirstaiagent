# Directive: Telegram No-Reply Triage

## Goal

Restore bot replies in Telegram and validate file ingestion in a repeatable way.

## Inputs

- Config path (`OPENCLAW_CONFIG_PATH` or default config file)
- Runtime environment variables
- Current deployment target (local or Cloud Run)

## Execution tools

1. `execution/startup_readiness.py`
2. `execution/check_telegram_runtime.py`
3. `execution/check_config_drift.py`

## Procedure

1. Run startup readiness:

```bash
python3 execution/startup_readiness.py
```

2. Run Telegram-specific runtime check:

```bash
python3 execution/check_telegram_runtime.py
```

3. If replies still fail, run drift audit:

```bash
python3 execution/check_config_drift.py
```

4. Apply only minimal config/env fixes indicated by failed checks.
5. Re-test with:

- one plain text Telegram message
- one file upload (document/image)

## Pass criteria

- Telegram enabled and policies allow sender/group path
- Required token/key env vars are present
- At least one valid model key mapping is present
- No critical readiness failures

## Common edge cases

- `channels.telegram.enabled` false
- `allowFrom` blocks sender
- group `requireMention` true when message is unmentioned
- wrong config path mounted in Cloud Run
- key alias drift (e.g., `GEMINI_API_KEY` present but runtime expects `GOOGLE_API_KEY`)

## Output

- Short incident summary with:
  - failing gate
  - exact fix
  - verification result
