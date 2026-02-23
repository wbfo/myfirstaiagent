#!/usr/bin/env python3
"""Deterministic quality gate checker for orchestration outputs."""

from __future__ import annotations

import json
import sys
from typing import Any, Dict, List


REQUIRED_BY_SCHEMA = {
    "ops_result": ["task_id", "status", "route"],
    "quality_result": ["task_id", "status", "confidence", "checks"],
    "architect_result": ["execution_plan", "security_review", "confidence"],
    "research_result": ["opportunity_brief", "recommended_next_step"],
    "deal_result": ["deal_package", "confidence"],
    "market_signal": ["signal", "advisory_only"],
}


def _load_input() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def _required_fields(schema: str) -> List[str]:
    return REQUIRED_BY_SCHEMA.get(schema, [])


def main() -> int:
    payload = _load_input()
    schema = str(payload.get("required_schema", "")).strip()
    task_id = str(payload.get("task_id", "unknown")).strip() or "unknown"
    output = payload.get("output", {})
    if not isinstance(output, dict):
        output = {}

    required = _required_fields(schema)
    checks = []
    risk_flags: List[str] = []
    remediation: List[str] = []

    for name in required:
        passed = name in output
        checks.append({"name": name, "passed": passed, "note": "" if passed else "missing"})
        if not passed:
            risk_flags.append(f"missing:{name}")
            remediation.append(f"add field '{name}' to output")

    confidence = float(payload.get("confidence", output.get("confidence", 0.0) or 0.0))
    if confidence < 0.5:
        risk_flags.append("low_confidence")
        remediation.append("increase evidence quality or escalate for review")

    status = "ok"
    if any(not entry["passed"] for entry in checks):
        status = "blocked"
    elif risk_flags:
        status = "needs_review"

    out = {
        "task_id": task_id,
        "status": status,
        "confidence": confidence,
        "checks": checks,
        "risk_flags": risk_flags,
        "remediation": remediation,
    }
    print(json.dumps(out, indent=2))
    return 0 if status == "ok" else 2


if __name__ == "__main__":
    sys.exit(main())
