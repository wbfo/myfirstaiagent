# Directive: Cloud Run Deploy And Rollback

## Goal

Deploy safely to Cloud Run, verify message path health, and rollback fast on regression.

## Inputs

- Current git SHA and target branch
- Cloud Run service/revision details
- Environment variable set for deployed revision

## Execution tools

1. `execution/startup_readiness.py`
2. `execution/check_config_drift.py`

## Procedure

1. Validate readiness locally before deploy:
```bash
python3 execution/startup_readiness.py
```
2. Validate config/env mapping:
```bash
python3 execution/check_config_drift.py
```
3. Deploy revision.
4. Observe startup logs and first inbound/outbound Telegram cycle.
5. If critical regression is confirmed, rollback immediately to last known-good revision.
6. Capture failing revision details and patch root cause.

## Rollback triggers

- Gateway fails startup
- Telegram updates are received but replies are never sent
- Critical auth/config errors at startup

## Output

- Deployment status
- Regression decision (`keep` or `rollback`)
- Root cause notes (if failed)
