#!/usr/bin/env python3
"""Health checks for specialist runtime dependencies (ZeroClaw + NanoBot)."""

from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
from typing import Any, Dict, List

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_ZEROCLAW_BIN = pathlib.Path.home() / ".cargo" / "bin" / "zeroclaw"
DEFAULT_NANOBOT_BIN = (
    pathlib.Path(__file__).resolve().parents[2] / "agent_runtimes" / "NanoBot" / ".venv" / "bin" / "nanobot"
)


def _has_any(*env_names: str) -> bool:
    return any(os.environ.get(name, "").strip() for name in env_names)


def _cmd_ok(cmd: List[str], timeout: int = 15) -> Dict[str, Any]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        return {"ok": False, "exitCode": 127, "stdout": "", "stderr": "binary not found"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "exitCode": 124, "stdout": "", "stderr": "timeout"}

    return {
        "ok": proc.returncode == 0,
        "exitCode": proc.returncode,
        "stdout": (proc.stdout or "").strip(),
        "stderr": (proc.stderr or "").strip(),
    }


def _runtime_check(name: str, binary: pathlib.Path, version_cmd: List[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "runtime": name,
        "binary": str(binary),
        "binaryExists": binary.exists(),
        "ok": False,
        "version": None,
        "errors": [],
    }

    if not binary.exists():
        out["errors"].append("binary missing")
        return out

    version = _cmd_ok(version_cmd)
    if version["ok"]:
        out["ok"] = True
        out["version"] = version["stdout"]
    else:
        out["errors"].append(version["stderr"] or f"version command failed: {version['exitCode']}")

    return out


def main() -> int:
    zeroclaw_bin = pathlib.Path(os.environ.get("HB_ZEROCLAW_BIN", str(DEFAULT_ZEROCLAW_BIN))).expanduser()
    nanobot_bin = pathlib.Path(os.environ.get("HB_NANOBOT_BIN", str(DEFAULT_NANOBOT_BIN))).expanduser()

    checks = [
        _runtime_check("zeroclaw", zeroclaw_bin, [str(zeroclaw_bin), "--version"]),
        _runtime_check("nanobot", nanobot_bin, [str(nanobot_bin), "--version"]),
    ]

    credentials = {
        "OPENROUTER_API_KEY": _has_any("OPENROUTER_API_KEY"),
        "OPENAI_API_KEY": _has_any("OPENAI_API_KEY"),
        "ANTHROPIC_API_KEY": _has_any("ANTHROPIC_API_KEY"),
        "GOOGLE_API_KEY": _has_any("GOOGLE_API_KEY"),
        "GEMINI_API_KEY": _has_any("GEMINI_API_KEY"),
    }

    if not credentials["OPENROUTER_API_KEY"]:
        checks[0]["ok"] = False
        checks[0]["errors"].append("missing OPENROUTER_API_KEY for configured ZeroClaw provider")

    if not any(
        [
            credentials["OPENROUTER_API_KEY"],
            credentials["OPENAI_API_KEY"],
            credentials["ANTHROPIC_API_KEY"],
            credentials["GOOGLE_API_KEY"],
            credentials["GEMINI_API_KEY"],
        ]
    ):
        checks[1]["ok"] = False
        checks[1]["errors"].append("missing model provider API key for NanoBot")

    failures = [item for item in checks if not item["ok"]]
    out = {
        "check": "agent-runtime-health",
        "ok": len(failures) == 0,
        "checks": checks,
        "credentials": credentials,
        "failedCount": len(failures),
    }
    print(json.dumps(out, indent=2))
    return 0 if out["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
