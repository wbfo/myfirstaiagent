#!/usr/bin/env python3
"""Check common config/env drift for OpenClaw Cloud Run runtime."""

from __future__ import annotations

import json
import os
import pathlib
import sys
from typing import Any, Dict, List


def _resolve_config_path() -> pathlib.Path:
    raw = os.environ.get("OPENCLAW_CONFIG_PATH", "").strip()
    if raw:
        return pathlib.Path(raw).expanduser()
    return pathlib.Path.home() / ".openclaw" / "openclaw.json"


def _load_json(path: pathlib.Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _present(*names: str) -> bool:
    return any(os.environ.get(name, "").strip() for name in names)


def main() -> int:
    cfg_path = _resolve_config_path()
    cfg = _load_json(cfg_path)

    issues: List[str] = []
    warnings: List[str] = []

    port_env = os.environ.get("OPENCLAW_GATEWAY_PORT", "").strip()
    cloudrun_port = os.environ.get("PORT", "").strip()
    if cloudrun_port and port_env and cloudrun_port != port_env:
        issues.append(f"OPENCLAW_GATEWAY_PORT ({port_env}) != PORT ({cloudrun_port})")
    if cloudrun_port and not port_env:
        warnings.append("PORT is set but OPENCLAW_GATEWAY_PORT is missing")

    gemini_present = _present("GEMINI_API_KEY")
    google_present = _present("GOOGLE_API_KEY")
    if gemini_present and not google_present:
        warnings.append("GEMINI_API_KEY present without GOOGLE_API_KEY alias")

    telegram_enabled = bool(((((cfg.get("channels") or {}).get("telegram")) or {}).get("enabled")) is True)
    if telegram_enabled and not _present("OPENCLAW_TELEGRAM_TOKEN", "TELEGRAM_BOT_TOKEN"):
        issues.append("Telegram enabled in config but token env var missing")

    result = {
        "check": "config-drift",
        "configPath": str(cfg_path),
        "ok": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "summary": {
            "port": {
                "OPENCLAW_GATEWAY_PORT": port_env or None,
                "PORT": cloudrun_port or None,
            },
            "keys": {
                "GEMINI_API_KEY": gemini_present,
                "GOOGLE_API_KEY": google_present,
            },
            "telegramEnabledInConfig": telegram_enabled,
        },
    }
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
