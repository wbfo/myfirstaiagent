---
name: honeybadger-config-secrets-audit
description: Audit config and secrets consistency across local, CI, and Cloud Run. Use when behavior differs by environment or credentials seem valid but runtime fails.
---

# Honeybadger Config + Secrets Audit

Use this skill to detect configuration drift and missing/incorrect secrets.

## Audit flow

1. Build a config matrix:
- local config
- deployed config file
- CI/CD env var mappings

2. Build a secret matrix:
- required keys
- where each key is expected
- presence/absence by environment

3. Detect drift:
- key name mismatches
- stale or legacy variable names
- missing aliases used by providers

4. Produce remediation:
- minimal key renames
- env var unification plan
- rotation plan if leakage risk exists

## Guardrails

- never print raw secret values
- only report presence, source, and usage path
