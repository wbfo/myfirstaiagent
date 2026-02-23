---
name: honeybadger-skill-factory
description: Create new project skills on demand with consistent naming, metadata, and structure. Use when the team identifies a repeatable workflow gap.
---

# Honeybadger Skill Factory

Use this skill whenever we need to add a new skill quickly and consistently.

## Creation contract

1. Name format:

- `honeybadger-<domain>-<purpose>`
- lowercase + hyphen only

2. Required files:

- `<skill-dir>/SKILL.md` with frontmatter (`name`, `description`)

3. Optional files:

- `references/` for deep docs
- `scripts/` for deterministic steps
- `assets/` for templates/artifacts

4. Quality gate before adding:

- clear trigger condition
- concise workflow
- explicit output format
- no tool or flag hallucinations

## Process

1. Identify repeated failure/workflow.
2. Draft minimal SKILL.md.
3. Add only resources needed for execution.
4. Validate with one real task.
5. Refine after first use.

For advanced packaging workflows, defer to the existing `skill-creator` skill.
