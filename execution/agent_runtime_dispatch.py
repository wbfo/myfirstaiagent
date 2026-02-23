#!/usr/bin/env python3
"""Dispatch specialist tasks to concrete external runtimes (ZeroClaw/NanoBot)."""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
import time
from typing import Any, Dict

from specialist_runtime import (
    MAP_PATH,
    SUPPORTED_AGENTS,
    build_command,
    build_prompt,
    load_json,
    load_stdin_json,
    redacted_command,
    timeout_s,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Dispatch a specialist task to a configured runtime")
    parser.add_argument("--dry-run", action="store_true", help="Build command without executing model call")
    args = parser.parse_args()

    payload = load_stdin_json(sys.stdin.read())
    task_id = str(payload.get("task_id", "unknown")).strip() or "unknown"
    agent_id = str(payload.get("agent_id", "")).strip()

    out: Dict[str, Any] = {
        "task_id": task_id,
        "agent_id": agent_id,
        "status": "blocked",
        "runtime": None,
        "command": [],
        "duration_ms": 0,
        "result_text": "",
        "error": "",
        "risk_flags": [],
    }

    if agent_id not in SUPPORTED_AGENTS:
        out["error"] = f"unsupported agent_id: {agent_id}"
        out["risk_flags"].append("unsupported_agent")
        print(json.dumps(out, indent=2))
        return 2

    if not MAP_PATH.exists():
        out["error"] = f"runtime map missing: {MAP_PATH}"
        out["risk_flags"].append("missing_runtime_map")
        print(json.dumps(out, indent=2))
        return 2

    runtime_map = load_json(MAP_PATH)
    cfg = (((runtime_map.get("agents") or {}).get(agent_id)) or {})
    if not cfg:
        out["error"] = f"agent config missing in runtime map: {agent_id}"
        out["risk_flags"].append("missing_agent_runtime_config")
        print(json.dumps(out, indent=2))
        return 2

    runtime = str(cfg.get("runtime", "")).strip()
    out["runtime"] = runtime
    prompt = build_prompt(payload)
    try:
        cmd = build_command(cfg, prompt)
    except Exception as exc:
        out["error"] = str(exc)
        out["risk_flags"].append("runtime_command_build_failed")
        print(json.dumps(out, indent=2))
        return 2

    out["command"] = redacted_command(cmd)

    binary_path = pathlib.Path(cmd[0]).expanduser()
    if not binary_path.exists():
        out["error"] = f"runtime binary not found: {binary_path}"
        out["risk_flags"].append("runtime_binary_missing")
        print(json.dumps(out, indent=2))
        return 2

    if args.dry_run:
        out["status"] = "ok"
        print(json.dumps(out, indent=2))
        return 0

    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_s(payload),
        )
        out["duration_ms"] = int((time.time() - start) * 1000)
        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()

        out["result_text"] = stdout
        if proc.returncode != 0:
            out["status"] = "blocked"
            out["error"] = stderr or f"runtime returned non-zero exit code: {proc.returncode}"
            out["risk_flags"].append("runtime_nonzero_exit")
            print(json.dumps(out, indent=2))
            return 2

        if not stdout:
            out["status"] = "needs_review"
            out["risk_flags"].append("empty_runtime_response")
        else:
            out["status"] = "ok"

        print(json.dumps(out, indent=2))
        return 0 if out["status"] == "ok" else 2
    except subprocess.TimeoutExpired:
        out["duration_ms"] = int((time.time() - start) * 1000)
        out["error"] = "runtime timed out"
        out["risk_flags"].append("runtime_timeout")
        print(json.dumps(out, indent=2))
        return 2


if __name__ == "__main__":
    sys.exit(main())
