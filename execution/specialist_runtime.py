#!/usr/bin/env python3
"""Shared specialist runtime helpers for dispatch/orchestration scripts."""

from __future__ import annotations

import json
import os
import pathlib
from typing import Any, Dict

ROOT = pathlib.Path(__file__).resolve().parent
MAP_PATH = ROOT / "agent_runtime_map.json"
DEFAULT_ZEROCLAW_BIN = pathlib.Path.home() / ".cargo" / "bin" / "zeroclaw"
DEFAULT_NANOBOT_BIN = (
    pathlib.Path(__file__).resolve().parents[2] / "agent_runtimes" / "NanoBot" / ".venv" / "bin" / "nanobot"
)
DEFAULT_NANOBOT_ROOT = pathlib.Path(__file__).resolve().parents[2] / "agent_runtimes" / "NanoBot"
DEFAULT_ZEROCLAW_CONFIG_DIR = pathlib.Path(__file__).resolve().parents[1] / ".tmp" / "zeroclaw"
SUPPORTED_AGENTS = {"architect", "researcher", "deal-closer", "market-advisory"}


def load_json(path: pathlib.Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_stdin_json(raw: str) -> Dict[str, Any]:
    payload = raw.strip()
    if not payload:
        return {}
    return json.loads(payload)


def resolve_model(cfg: Dict[str, Any]) -> str:
    model_env = str(cfg.get("model_env", "")).strip()
    if model_env:
        override = os.environ.get(model_env, "").strip()
        if override:
            return override
    return str(cfg.get("default_model", "")).strip()


def build_prompt(payload: Dict[str, Any]) -> str:
    objective = str(payload.get("objective", "")).strip() or "No objective provided"
    context = payload.get("context", {})
    if not isinstance(context, dict):
        context = {"raw_context": str(context)}

    envelope = {
        "task_id": str(payload.get("task_id", "unknown")).strip() or "unknown",
        "objective": objective,
        "context": context,
        "required_output": {
            "summary": "string",
            "key_points": ["string"],
            "risks": ["string"],
            "recommended_next_step": "string",
            "confidence": "0.0-1.0",
        },
        "output_rule": "Respond as compact JSON only. No markdown.",
    }
    return json.dumps(envelope, ensure_ascii=True)


def build_command(agent_cfg: Dict[str, Any], prompt: str) -> list[str]:
    runtime = str(agent_cfg.get("runtime", "")).strip()
    if runtime == "zeroclaw":
        binary = pathlib.Path(os.environ.get("HB_ZEROCLAW_BIN", str(DEFAULT_ZEROCLAW_BIN))).expanduser()
        config_dir = pathlib.Path(
            os.environ.get("HB_ZEROCLAW_CONFIG_DIR", str(DEFAULT_ZEROCLAW_CONFIG_DIR))
        ).expanduser()
        config_dir.mkdir(parents=True, exist_ok=True)
        cmd = [str(binary), "agent", "--config-dir", str(config_dir), "--message", prompt]
        provider = str(agent_cfg.get("provider", "")).strip()
        model = resolve_model(agent_cfg)
        if provider:
            cmd += ["--provider", provider]
        if model:
            cmd += ["--model", model]
        return cmd

    if runtime == "nanobot":
        binary = pathlib.Path(os.environ.get("HB_NANOBOT_BIN", str(DEFAULT_NANOBOT_BIN))).expanduser()
        python_bin = binary.with_name("python")
        if python_bin.exists():
            return [
                str(python_bin),
                "-m",
                "nanobot.cli.commands",
                "agent",
                "--message",
                prompt,
            ]
        return [str(binary), "agent", "--message", prompt]

    raise ValueError(f"unsupported runtime: {runtime}")


def timeout_s(payload: Dict[str, Any]) -> int:
    raw = int(payload.get("deadline_s", 120))
    if raw <= 0:
        return 30
    return min(raw + 15, 180)


def redacted_command(cmd: list[str]) -> list[str]:
    redacted = list(cmd)
    for i, part in enumerate(redacted[:-1]):
        if part == "--message":
            redacted[i + 1] = "<PROMPT>"
            break
    return redacted
