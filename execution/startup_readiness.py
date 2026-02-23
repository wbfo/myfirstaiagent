#!/usr/bin/env python3
"""Run startup readiness checks and summarize status."""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
import argparse
from typing import Any, Dict, List


ROOT = pathlib.Path(__file__).resolve().parent


def _run(script_name: str, extra_args: List[str] | None = None) -> Dict[str, Any]:
    script = ROOT / script_name
    if not script.exists():
        return {
            "script": script_name,
            "ok": False,
            "exitCode": 127,
            "result": {"errors": [f"missing script: {script_name}"]},
        }
    cmd = [sys.executable, str(script)]
    if extra_args:
        cmd.extend(extra_args)
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )
    stdout = proc.stdout.strip()
    parsed: Dict[str, Any]
    if stdout:
        try:
            parsed = json.loads(stdout)
        except Exception:
            parsed = {"rawStdout": stdout}
    else:
        parsed = {}
    return {
        "script": script_name,
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "result": parsed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run startup readiness checks")
    parser.add_argument(
        "--live-specialists",
        action="store_true",
        help="Run specialist smoke tests with real model calls (consumes API credits)",
    )
    parser.add_argument(
        "--dry-run-specialists",
        action="store_true",
        help="Force specialist smoke tests to run in dry-run mode",
    )
    args = parser.parse_args()

    specialist_args: List[str] = []
    if args.dry_run_specialists:
        specialist_args = []
    elif args.live_specialists:
        specialist_args = ["--live"]

    checks = [
        _run("check_telegram_runtime.py"),
        _run("check_config_drift.py"),
        _run("agent_runtime_health.py"),
        _run("smoke_test_specialists.py", specialist_args),
    ]
    failures: List[Dict[str, Any]] = [c for c in checks if not c["ok"]]
    warnings: List[str] = []
    smoke_check = next((item for item in checks if item.get("script") == "smoke_test_specialists.py"), None)
    smoke_mode = (
        (smoke_check or {}).get("result", {}).get("mode")
        if isinstance((smoke_check or {}).get("result"), dict)
        else None
    )
    if smoke_mode == "dry-run":
        warnings.append(
            "specialist smoke check ran in dry-run mode; use --live-specialists for functional runtime verification"
        )
    out = {
        "check": "startup-readiness",
        "ok": len(failures) == 0,
        "checks": checks,
        "failedCount": len(failures),
        "warnings": warnings,
    }
    print(json.dumps(out, indent=2))
    return 0 if out["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
