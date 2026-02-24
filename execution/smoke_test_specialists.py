#!/usr/bin/env python3
"""Smoke test specialist runtime wiring through deterministic dispatcher."""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
from typing import Any, Dict, List

ROOT = pathlib.Path(__file__).resolve().parent
DISPATCH = ROOT / "agent_runtime_dispatch.py"
AGENTS = [
    "knowledge-management",
    "strategic-horizon-systems",
    "operational-diagnostics-optimization",
    "creative-director",
    "architect",
    "researcher",
    "deal-closer",
    "market-advisory",
]


def _run_dispatch(agent_id: str, live: bool) -> Dict[str, Any]:
    payload = {
        "task_id": f"smoke-{agent_id}",
        "agent_id": agent_id,
        "objective": "Return a one-line readiness acknowledgement.",
        "context": {"mode": "smoke-test"},
        "deadline_s": 45,
    }
    cmd = [sys.executable, str(DISPATCH)]
    if not live:
        cmd.append("--dry-run")

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
        "agent_id": agent_id,
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "result": parsed,
        "stderr": (proc.stderr or "").strip(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test specialist runtime integration")
    parser.add_argument("--live", action="store_true", help="Run live model calls (may consume API credits)")
    args = parser.parse_args()

    if not DISPATCH.exists():
        out = {
            "check": "specialist-smoke-test",
            "ok": False,
            "error": f"missing dispatch script: {DISPATCH}",
        }
        print(json.dumps(out, indent=2))
        return 2

    checks: List[Dict[str, Any]] = [_run_dispatch(agent, args.live) for agent in AGENTS]
    failed = [item for item in checks if not item["ok"]]

    out = {
        "check": "specialist-smoke-test",
        "mode": "live" if args.live else "dry-run",
        "ok": len(failed) == 0,
        "checks": checks,
        "failedCount": len(failed),
    }
    print(json.dumps(out, indent=2))
    return 0 if out["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
