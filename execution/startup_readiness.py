#!/usr/bin/env python3
"""Run startup readiness checks and summarize status."""

from __future__ import annotations

import json
import pathlib
import subprocess
import sys
from typing import Any, Dict, List


ROOT = pathlib.Path(__file__).resolve().parent


def _run(script_name: str) -> Dict[str, Any]:
    script = ROOT / script_name
    if not script.exists():
        return {
            "script": script_name,
            "ok": False,
            "exitCode": 127,
            "result": {"errors": [f"missing script: {script_name}"]},
        }
    proc = subprocess.run(
        [sys.executable, str(script)],
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
    checks = [
        _run("check_telegram_runtime.py"),
        _run("check_config_drift.py"),
        _run("agent_runtime_health.py"),
        _run("smoke_test_specialists.py"),
    ]
    failures: List[Dict[str, Any]] = [c for c in checks if not c["ok"]]
    out = {
        "check": "startup-readiness",
        "ok": len(failures) == 0,
        "checks": checks,
        "failedCount": len(failures),
    }
    print(json.dumps(out, indent=2))
    return 0 if out["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
