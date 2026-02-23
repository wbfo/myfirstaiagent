# Directive: Skills Governance

## Goal

Keep skills cohesive, discoverable, and safe without breaking runtime loading.

## Rules

1. Keep loader-compatible layout:
```text
skills/<skill-name>/SKILL.md
```
2. Do not rename `SKILL.md`.
3. Use descriptive folder names; for project-specific skills prefer:
```text
honeybadger-<domain>-<purpose>
```
4. Curate active runtime set via `agents.defaults.skills` in config.
5. New skills must define:
- clear trigger condition
- minimal deterministic workflow
- expected output format

## Procedure for adding a skill

1. Create folder + `SKILL.md`.
2. Add to curated list only if actively needed.
3. Run readiness check:
```bash
python3 execution/startup_readiness.py
```
4. Verify skill appears in startup preflight logs.

## Output

- Updated skill inventory
- Whether skill is active-only or installed-but-inactive
