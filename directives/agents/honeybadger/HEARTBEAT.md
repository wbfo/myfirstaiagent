# HoneyBadger Heartbeat

## Cadence

1. Weekly War Room (30 minutes max).
2. Daily status check for critical queues/incidents.

## Triggered checks

1. On Telegram reliability issues:
```bash
python3 execution/startup_readiness.py
```
2. On deployment changes:
```bash
python3 execution/check_config_drift.py
```
