# Skills Directory

This directory is organized as one folder per skill.

## Required structure

Each skill must follow this pattern:

```text
skills/<skill-name>/SKILL.md
```

Example:

```text
skills/honeybadger-telegram-diagnostics/SKILL.md
```

Do not rename `SKILL.md` to custom filenames. The loader expects `SKILL.md` inside each skill folder.

## Naming convention

- Folder name: lowercase, hyphen-separated, descriptive
- Recommended format for project-specific skills: `honeybadger-<domain>-<purpose>`

## Optional per-skill folders

If needed, skills may include:

- `references/` for detailed docs
- `scripts/` for deterministic helpers
- `assets/` for templates or static resources

## Centralized active set

The default HoneyBadger operating set is currently scoped to this curated list:

- `honeybadger-telegram-diagnostics`
- `honeybadger-config-secrets-audit`
- `honeybadger-observability`
- `honeybadger-skill-factory`
- `skill-creator`

This keeps the operational skill surface cohesive while preserving full compatibility with skill discovery.
