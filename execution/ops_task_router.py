#!/usr/bin/env python3
"""Deterministic routing helper for HoneyBadger orchestration tasks."""

from __future__ import annotations

import json
import sys
from typing import Any, Dict


ROUTE_BY_TASK = {
    "incident_telegram": "ops-coordinator",
    "incident_deploy": "ops-coordinator",
    "design_change": "architect",
    "research_request": "researcher",
    "deal_strategy": "deal-closer",
    "market_signal_scan": "market-advisory",
}


def _load_input() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def main() -> int:
    payload = _load_input()
    task_type = str(payload.get("task_type", "")).strip()
    task_id = str(payload.get("task_id", "unknown")).strip() or "unknown"
    deadline_s = int(payload.get("deadline_s", 120))

    route = ROUTE_BY_TASK.get(task_type, "ops-coordinator")
    risk_flags = []
    status = "ok"
    reason = "routed_by_task_type"
    retry_allowed = True
    retry_after = 2

    if deadline_s <= 0:
        status = "blocked"
        reason = "invalid_deadline"
        retry_allowed = False
        risk_flags.append("invalid_deadline")
    elif deadline_s < 30:
        status = "needs_review"
        reason = "deadline_too_tight"
        risk_flags.append("tight_deadline")

    out = {
        "task_id": task_id,
        "status": status,
        "route": route,
        "retry": {"allowed": retry_allowed, "after_s": retry_after},
        "reason": reason,
        "risk_flags": risk_flags,
    }
    print(json.dumps(out, indent=2))
    return 0 if status != "blocked" else 2


if __name__ == "__main__":
    sys.exit(main())
