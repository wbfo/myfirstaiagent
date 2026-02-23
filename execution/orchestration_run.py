#!/usr/bin/env python3
"""Run full deterministic orchestration cycle: route -> dispatch -> quality gate."""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
from typing import Any, Dict

ROOT = pathlib.Path(__file__).resolve().parent
ROUTER = ROOT / "ops_task_router.py"
DISPATCH = ROOT / "agent_runtime_dispatch.py"
GATE = ROOT / "quality_gate_check.py"

SCHEMA_BY_AGENT = {
    "architect": "architect_result",
    "researcher": "research_result",
    "deal-closer": "deal_result",
    "market-advisory": "market_signal",
}


def _load_input() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def _run_script(script: pathlib.Path, payload: Dict[str, Any], extra_args: list[str] | None = None) -> Dict[str, Any]:
    cmd = [sys.executable, str(script)]
    if extra_args:
        cmd.extend(extra_args)

    proc = subprocess.run(
        cmd,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
    )
    stdout = (proc.stdout or "").strip()
    parsed: Dict[str, Any]
    try:
        parsed = json.loads(stdout) if stdout else {}
    except Exception:
        parsed = {"raw_stdout": stdout}

    return {
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "result": parsed,
        "stderr": (proc.stderr or "").strip(),
    }


def _try_parse_json(text: str) -> Dict[str, Any]:
    body = text.strip()
    if not body:
        return {}
    try:
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return {}
    return {}


def main() -> int:
    payload = _load_input()
    task_id = str(payload.get("task_id", "unknown")).strip() or "unknown"

    router_in = {
        "task_id": task_id,
        "task_type": payload.get("task_type", ""),
        "deadline_s": payload.get("deadline_s", 120),
    }
    routed = _run_script(ROUTER, router_in)

    out: Dict[str, Any] = {
        "task_id": task_id,
        "status": "blocked",
        "route": None,
        "router": routed,
        "dispatch": None,
        "quality_gate": None,
        "risk_flags": [],
    }

    if not routed["ok"]:
        out["risk_flags"].append("routing_failed")
        print(json.dumps(out, indent=2))
        return 2

    route = str((routed["result"] or {}).get("route", "")).strip()
    out["route"] = route
    if route not in SCHEMA_BY_AGENT:
        out["risk_flags"].append("unsupported_route")
        print(json.dumps(out, indent=2))
        return 2

    dispatch_in = {
        "task_id": task_id,
        "agent_id": route,
        "objective": payload.get("objective", ""),
        "context": payload.get("context", {}),
        "deadline_s": payload.get("deadline_s", 120),
    }
    dry_run = bool(payload.get("dry_run", True))
    dispatch = _run_script(DISPATCH, dispatch_in, ["--dry-run"] if dry_run else None)
    out["dispatch"] = dispatch

    if not dispatch["ok"]:
        out["risk_flags"].append("dispatch_failed")
        print(json.dumps(out, indent=2))
        return 2

    if dry_run:
        out["status"] = "ok"
        out["quality_gate"] = {"ok": True, "skipped": True, "reason": "dry_run"}
        print(json.dumps(out, indent=2))
        return 0

    dispatch_result = dispatch["result"] or {}
    model_output = _try_parse_json(str(dispatch_result.get("result_text", "")))
    schema = SCHEMA_BY_AGENT[route]
    gate_in = {
        "task_id": task_id,
        "required_schema": schema,
        "confidence": payload.get("confidence", 0.6),
        "output": model_output,
    }
    gate = _run_script(GATE, gate_in)
    out["quality_gate"] = gate

    if not gate["ok"]:
        out["status"] = "needs_review"
        out["risk_flags"].append("quality_gate_failed")
        print(json.dumps(out, indent=2))
        return 2

    out["status"] = "ok"
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
