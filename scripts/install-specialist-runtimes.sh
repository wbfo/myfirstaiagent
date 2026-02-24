#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_APP_ROOTS=(
  "/Users/abimbolaolaitan/Desktop/OPENopenclaw/openclaw_app"
  "/Users/wbfoclaw/OPENopenclaw/openclaw_app"
)

BLOCKERS=()
NEXT_ACTIONS=()
COMMANDS_RUN=()

add_blocker() {
  BLOCKERS+=("$1")
}

add_next_action() {
  NEXT_ACTIONS+=("$1")
}

add_command() {
  COMMANDS_RUN+=("$1")
}

write_lines_file() {
  local out_file="$1"
  shift || true
  : > "${out_file}"
  if [[ "$#" -gt 0 ]]; then
    printf "%s\n" "$@" > "${out_file}"
  fi
}

resolve_app_root() {
  local requested="${1:-}"
  local candidate

  if [[ -n "${requested}" ]]; then
    if [[ -d "${requested}" && -f "${requested}/openclaw.mjs" ]]; then
      (cd "${requested}" && pwd)
      return 0
    fi
  fi

  for candidate in "${DEFAULT_APP_ROOTS[@]}"; do
    if [[ -d "${candidate}" && -f "${candidate}/openclaw.mjs" ]]; then
      (cd "${candidate}" && pwd)
      return 0
    fi
  done

  if git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    if [[ -f "${git_root}/openclaw.mjs" ]]; then
      (cd "${git_root}" && pwd)
      return 0
    fi
  fi

  if [[ -f "${REPO_ROOT}/openclaw.mjs" ]]; then
    (cd "${REPO_ROOT}" && pwd)
    return 0
  fi

  return 1
}

APP_ROOT="$(resolve_app_root "${1:-}")" || {
  echo '{"error":"Unable to resolve APP_ROOT with openclaw.mjs"}'
  exit 2
}

ROOT_PARENT="$(cd "${APP_ROOT}/.." && pwd)"
RUNTIMES_ROOT="${ROOT_PARENT}/agent_runtimes"
ZEROCLAW_DIR="${RUNTIMES_ROOT}/zeroclaw"
NANOBOT_DIR="${RUNTIMES_ROOT}/NanoBot"
ZEROCLAW_URL="https://github.com/zeroclaw-labs/zeroclaw.git"
NANOBOT_URL="https://github.com/HKUDS/NanoBot.git"
ZEROCLAW_BIN="${HB_ZEROCLAW_BIN:-${HOME}/.cargo/bin/zeroclaw}"
NANOBOT_BIN="${HB_NANOBOT_BIN:-${NANOBOT_DIR}/.venv/bin/nanobot}"
NANOBOT_PY="${NANOBOT_DIR}/.venv/bin/python"

mkdir -p "${RUNTIMES_ROOT}"

if [[ ! -d "${ZEROCLAW_DIR}/.git" ]]; then
  add_command "git -C ${RUNTIMES_ROOT} clone --depth 1 ${ZEROCLAW_URL} zeroclaw"
  if ! git -C "${RUNTIMES_ROOT}" clone --depth 1 "${ZEROCLAW_URL}" zeroclaw >/dev/null 2>&1; then
    add_blocker "Failed to clone zeroclaw from ${ZEROCLAW_URL}"
  fi
fi

if [[ ! -d "${NANOBOT_DIR}/.git" ]]; then
  add_command "git -C ${RUNTIMES_ROOT} clone --depth 1 ${NANOBOT_URL} NanoBot"
  if ! git -C "${RUNTIMES_ROOT}" clone --depth 1 "${NANOBOT_URL}" NanoBot >/dev/null 2>&1; then
    add_blocker "Failed to clone NanoBot from ${NANOBOT_URL}"
  fi
fi

if [[ ! -x "${ZEROCLAW_BIN}" && -d "${ZEROCLAW_DIR}" ]]; then
  if [[ -x "${ZEROCLAW_DIR}/bootstrap.sh" ]]; then
    add_command "cd ${ZEROCLAW_DIR} && ./bootstrap.sh --prefer-prebuilt"
    if ! (cd "${ZEROCLAW_DIR}" && ./bootstrap.sh --prefer-prebuilt >/dev/null 2>&1); then
      add_blocker "ZeroClaw bootstrap failed in ${ZEROCLAW_DIR}"
    fi
  fi
fi

if [[ ! -x "${ZEROCLAW_BIN}" && -d "${ZEROCLAW_DIR}" ]]; then
  if command -v cargo >/dev/null 2>&1; then
    add_command "cd ${ZEROCLAW_DIR} && cargo install --path . --force --locked"
    if ! (cd "${ZEROCLAW_DIR}" && cargo install --path . --force --locked >/dev/null 2>&1); then
      add_blocker "ZeroClaw cargo install failed in ${ZEROCLAW_DIR}"
      add_next_action "Inspect ZeroClaw build errors in ${ZEROCLAW_DIR} and re-run install."
    fi
  else
    add_blocker "Rust cargo not found; cannot install zeroclaw."
    add_next_action "Install Rust toolchain (rustup) then rerun this script."
  fi
fi

if [[ -d "${NANOBOT_DIR}" && ! -x "${NANOBOT_PY}" ]]; then
  if command -v uv >/dev/null 2>&1; then
    add_command "cd ${NANOBOT_DIR} && uv venv --python 3.11 .venv"
    if ! (cd "${NANOBOT_DIR}" && uv venv --python 3.11 .venv >/dev/null 2>&1); then
      add_blocker "NanoBot uv venv creation failed in ${NANOBOT_DIR}"
    fi
  else
    add_command "python3 -m venv ${NANOBOT_DIR}/.venv"
    if ! python3 -m venv "${NANOBOT_DIR}/.venv" >/dev/null 2>&1; then
      add_blocker "NanoBot python venv creation failed in ${NANOBOT_DIR}"
      add_next_action "Install Python 3.11+ and rerun this script."
    fi
  fi
fi

if [[ -x "${NANOBOT_BIN}" ]]; then
  :
elif [[ -x "${NANOBOT_PY}" ]]; then
  if ! "${NANOBOT_PY}" -m pip --version >/dev/null 2>&1; then
    add_command "cd ${NANOBOT_DIR} && .venv/bin/python -m ensurepip --upgrade"
    if ! (cd "${NANOBOT_DIR}" && .venv/bin/python -m ensurepip --upgrade >/dev/null 2>&1); then
      add_blocker "NanoBot ensurepip failed in ${NANOBOT_DIR}"
    fi
  fi

  add_command "cd ${NANOBOT_DIR} && .venv/bin/python -m pip install -e ."
  if ! (cd "${NANOBOT_DIR}" && .venv/bin/python -m pip install -e . >/dev/null 2>&1); then
    if [[ ! -x "${NANOBOT_BIN}" ]]; then
      add_blocker "NanoBot editable install failed and binary missing in ${NANOBOT_DIR}"
      add_next_action "Inspect pip output in ${NANOBOT_DIR} and rerun install."
    else
      add_next_action "NanoBot binary already present; skip editable reinstall in offline environments."
    fi
  fi
else
  add_blocker "NanoBot Python executable missing at ${NANOBOT_PY}"
fi

if [[ ! -x "${ZEROCLAW_BIN}" ]]; then
  add_blocker "zeroclaw binary not found at ${ZEROCLAW_BIN}"
  add_next_action "Set HB_ZEROCLAW_BIN or install zeroclaw to ~/.cargo/bin/zeroclaw."
fi

if [[ ! -x "${NANOBOT_BIN}" && ! -x "${NANOBOT_PY}" ]]; then
  add_blocker "nanobot runtime executable missing at ${NANOBOT_BIN} and ${NANOBOT_PY}"
  add_next_action "Set HB_NANOBOT_BIN or install NanoBot at ${NANOBOT_DIR}."
fi

HEALTH_RC=1
HEALTH_OUT=""
if [[ -f "${APP_ROOT}/execution/agent_runtime_health.py" ]]; then
  add_command "python3 ${APP_ROOT}/execution/agent_runtime_health.py"
  set +e
  HEALTH_OUT="$(python3 "${APP_ROOT}/execution/agent_runtime_health.py" 2>&1)"
  HEALTH_RC=$?
  set -e
else
  add_blocker "Missing health check script: ${APP_ROOT}/execution/agent_runtime_health.py"
fi

if [[ "${HEALTH_RC}" -ne 0 ]]; then
  add_next_action "Set required API keys and rerun: python3 execution/agent_runtime_health.py"
fi

if [[ "${#NEXT_ACTIONS[@]}" -eq 0 ]]; then
  add_next_action "No further action required."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT
printf "%s" "${HEALTH_OUT}" > "${TMP_DIR}/health.txt"
write_lines_file "${TMP_DIR}/blockers.txt" "${BLOCKERS[@]:-}"
write_lines_file "${TMP_DIR}/next_actions.txt" "${NEXT_ACTIONS[@]:-}"
write_lines_file "${TMP_DIR}/commands_run.txt" "${COMMANDS_RUN[@]:-}"

APP_ROOT="${APP_ROOT}" \
ZEROCLAW_DIR="${ZEROCLAW_DIR}" \
NANOBOT_DIR="${NANOBOT_DIR}" \
ZEROCLAW_BIN="${ZEROCLAW_BIN}" \
NANOBOT_BIN="${NANOBOT_BIN}" \
NANOBOT_PY="${NANOBOT_PY}" \
HEALTH_RC="${HEALTH_RC}" \
TMP_DIR="${TMP_DIR}" \
node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const tmpDir = process.env.TMP_DIR;
const readLines = (name) => {
  try {
    return fs
      .readFileSync(path.join(tmpDir, name), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const healthRaw = (() => {
  try {
    return fs.readFileSync(path.join(tmpDir, "health.txt"), "utf8");
  } catch {
    return "";
  }
})();

let health = null;
try {
  health = JSON.parse(healthRaw);
} catch {
  health = null;
}

const result = {
  APP_ROOT: process.env.APP_ROOT || null,
  RUNTIME_REPOS: {
    zeroclaw: process.env.ZEROCLAW_DIR || null,
    nanobot: process.env.NANOBOT_DIR || null,
  },
  BINARIES: {
    zeroclaw: {
      path: process.env.ZEROCLAW_BIN || null,
      exists: !!(process.env.ZEROCLAW_BIN && fs.existsSync(process.env.ZEROCLAW_BIN)),
    },
    nanobot: {
      path: process.env.NANOBOT_BIN || null,
      exists: !!(process.env.NANOBOT_BIN && fs.existsSync(process.env.NANOBOT_BIN)),
    },
    nanobot_python: {
      path: process.env.NANOBOT_PY || null,
      exists: !!(process.env.NANOBOT_PY && fs.existsSync(process.env.NANOBOT_PY)),
    },
  },
  HEALTH_CHECK_STATUS:
    Number(process.env.HEALTH_RC || "1") === 0 ? "PASS" : "BLOCKED",
  HEALTH_CHECK: health,
  BLOCKERS: readLines("blockers.txt"),
  NEXT_ACTIONS: readLines("next_actions.txt"),
  COMMANDS_RUN: readLines("commands_run.txt"),
};

console.log(JSON.stringify(result, null, 2));
NODE
