# Directive: Weekly War Room

## Goal

Run a concise weekly review to align priorities, decisions, and risk controls.

## Agenda (30 minutes max)

1. KPI snapshot (5m)
2. Top blockers and risk flags (10m)
3. Decisions for next 7 days (10m)
4. Owners and deadlines (5m)

## Script

Generate summary from JSONL event logs:

```bash
python3 execution/war_room_summary.py .tmp/war_room/events.jsonl .tmp/war_room/WEEKLY_DECISIONS.md
```

## Required output

`WEEKLY_DECISIONS.md` must include:

1. KPI snapshot
2. Priority decisions
3. Assigned owners
4. Due dates
