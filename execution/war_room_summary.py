#!/usr/bin/env python3
"""Build a concise weekly War Room markdown summary from JSONL events."""

from __future__ import annotations

import json
import pathlib
import sys
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List


def _read_jsonl(path: pathlib.Path) -> Iterable[Dict[str, Any]]:
    if not path.exists():
        return []
    rows: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except Exception:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return rows


def _render(rows: Iterable[Dict[str, Any]]) -> str:
    rows = list(rows)
    status_counter = Counter(str(row.get("status", "unknown")) for row in rows)
    task_counter = Counter(str(row.get("task_type", "unknown")) for row in rows)
    risk_total = sum(len(row.get("risk_flags", []) or []) for row in rows)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

    top_tasks = ", ".join(f"{k} ({v})" for k, v in task_counter.most_common(5)) or "none"
    lines = [
        f"# Weekly War Room Summary ({now})",
        "",
        "## KPI Snapshot",
        f"- Total events: {len(rows)}",
        f"- Status counts: {dict(status_counter)}",
        f"- Total risk flags: {risk_total}",
        "",
        "## Top Activity",
        f"- Task types: {top_tasks}",
        "",
        "## Recommended Focus",
        "- Investigate repeated blocked/needs_review events first.",
        "- Convert top repeated risk flags into directive or script improvements.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    input_path = pathlib.Path(
        sys.argv[1] if len(sys.argv) > 1 else ".tmp/war_room/events.jsonl"
    ).expanduser()
    output_path = pathlib.Path(
        sys.argv[2] if len(sys.argv) > 2 else ".tmp/war_room/WEEKLY_DECISIONS.md"
    ).expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = _read_jsonl(input_path)
    markdown = _render(rows)
    output_path.write_text(markdown, encoding="utf-8")

    print(
        json.dumps(
            {
                "check": "war-room-summary",
                "input": str(input_path),
                "output": str(output_path),
                "events": len(list(rows)),
                "ok": True,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
