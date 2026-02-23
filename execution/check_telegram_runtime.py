#!/usr/bin/env python3
"""Check Telegram runtime readiness from config + env."""

from __future__ import annotations

import json
import os
import pathlib
import sys
from typing import Any, Dict, List


def _default_config_path() -> pathlib.Path:
    env_path = os.environ.get("OPENCLAW_CONFIG_PATH", "").strip()
    if env_path:
        return pathlib.Path(env_path).expanduser()
    return pathlib.Path.home() / ".openclaw" / "openclaw.json"


def _load_json(path: pathlib.Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"config file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _as_list(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = str(item).strip()
        if text:
            out.append(text)
    return out


def main() -> int:
    config_path = _default_config_path()
    result: Dict[str, Any] = {
        "check": "telegram-runtime",
        "configPath": str(config_path),
        "ok": True,
        "errors": [],
        "warnings": [],
        "summary": {},
    }

    try:
        cfg = _load_json(config_path)
    except Exception as exc:
        result["ok"] = False
        result["errors"].append(str(exc))
        print(json.dumps(result, indent=2))
        return 1

    telegram = (((cfg.get("channels") or {}).get("telegram")) or {})
    enabled = bool(telegram.get("enabled") is True)
    dm_policy = str(telegram.get("dmPolicy", "unset"))
    group_policy = str(telegram.get("groupPolicy", "unset"))
    allow_from = _as_list(telegram.get("allowFrom"))
    require_mention_wildcard = bool(
        ((((telegram.get("groups") or {}).get("*")) or {}).get("requireMention") is True)
    )

    bot_token_present = bool(
        os.environ.get("OPENCLAW_TELEGRAM_TOKEN", "").strip()
        or os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    )
    model_key_present = bool(
        os.environ.get("GOOGLE_API_KEY", "").strip()
        or os.environ.get("GEMINI_API_KEY", "").strip()
        or os.environ.get("OPENAI_API_KEY", "").strip()
        or os.environ.get("ANTHROPIC_API_KEY", "").strip()
    )

    if not enabled:
        result["ok"] = False
        result["errors"].append("channels.telegram.enabled is not true")
    if dm_policy == "closed" and "*" not in allow_from:
        result["warnings"].append("dmPolicy is closed and allowFrom is restrictive")
    if group_policy == "closed":
        result["warnings"].append("groupPolicy is closed")
    if require_mention_wildcard:
        result["warnings"].append("groups['*'].requireMention is true")
    if not bot_token_present:
        result["ok"] = False
        result["errors"].append("telegram bot token env var missing")
    if not model_key_present:
        result["ok"] = False
        result["errors"].append("no model provider API key found in env")

    result["summary"] = {
        "telegramEnabled": enabled,
        "dmPolicy": dm_policy,
        "groupPolicy": group_policy,
        "allowFromCount": len(allow_from),
        "requireMentionWildcard": require_mention_wildcard,
        "botTokenPresent": bot_token_present,
        "modelKeyPresent": model_key_present,
    }
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    sys.exit(main())
