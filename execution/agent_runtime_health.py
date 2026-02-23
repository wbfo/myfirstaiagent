#!/usr/bin/env python3
"""Health checks for specialist runtime dependencies (ZeroClaw + NanoBot)."""

from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
from typing import Any, Dict, List
from specialist_runtime import MAP_PATH, DEFAULT_NANOBOT_ROOT, load_json

ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_ZEROCLAW_BIN = pathlib.Path.home() / ".cargo" / "bin" / "zeroclaw"
DEFAULT_NANOBOT_BIN = (
    pathlib.Path(__file__).resolve().parents[2] / "agent_runtimes" / "NanoBot" / ".venv" / "bin" / "nanobot"
)


def _has_any(*env_names: str) -> bool:
    return any(os.environ.get(name, "").strip() for name in env_names)


def _cmd_ok(
    cmd: List[str],
    timeout: int = 15,
    cwd: pathlib.Path | None = None,
    env: Dict[str, str] | None = None,
) -> Dict[str, Any]:
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(cwd) if cwd else None,
            env=env,
        )
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

    checks = [_runtime_check("zeroclaw", zeroclaw_bin, [str(zeroclaw_bin), "--version"])]

    nanobot_root = pathlib.Path(os.environ.get("HB_NANOBOT_ROOT", str(DEFAULT_NANOBOT_ROOT))).expanduser()
    nanobot_python = nanobot_bin.with_name("python")
    if nanobot_python.exists():
        nanobot_env = os.environ.copy()
        current_pythonpath = nanobot_env.get("PYTHONPATH", "").strip()
        if current_pythonpath:
            nanobot_env["PYTHONPATH"] = f"{nanobot_root}:{current_pythonpath}"
        else:
            nanobot_env["PYTHONPATH"] = str(nanobot_root)
        nanobot_version = _cmd_ok(
            [str(nanobot_python), "-m", "nanobot.cli.commands", "--version"],
            env=nanobot_env,
            cwd=nanobot_root,
        )
        checks.append(
            {
                "runtime": "nanobot",
                "binary": str(nanobot_bin),
                "binaryExists": nanobot_bin.exists(),
                "ok": nanobot_version["ok"],
                "version": nanobot_version["stdout"] if nanobot_version["ok"] else None,
                "errors": [] if nanobot_version["ok"] else [nanobot_version["stderr"] or "version command failed"],
            }
        )
    else:
        checks.append(_runtime_check("nanobot", nanobot_bin, [str(nanobot_bin), "--version"]))

    credentials = {
        "OPENROUTER_API_KEY": _has_any("OPENROUTER_API_KEY"),
        "OPENAI_API_KEY": _has_any("OPENAI_API_KEY"),
        "ANTHROPIC_API_KEY": _has_any("ANTHROPIC_API_KEY"),
        "GOOGLE_API_KEY": _has_any("GOOGLE_API_KEY"),
        "GEMINI_API_KEY": _has_any("GEMINI_API_KEY"),
    }

    runtime_map = load_json(MAP_PATH) if MAP_PATH.exists() else {}
    agents = ((runtime_map.get("agents") or {}) if isinstance(runtime_map, dict) else {}) or {}
    zeroclaw_providers = {
        str(cfg.get("provider", "")).strip().lower()
        for cfg in agents.values()
        if isinstance(cfg, dict) and str(cfg.get("runtime", "")).strip().lower() == "zeroclaw"
    }

    if "openrouter" in zeroclaw_providers and not credentials["OPENROUTER_API_KEY"]:
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
