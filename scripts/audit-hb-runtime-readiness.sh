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

compact_line() {
  printf "%s" "$1" | tr "\n" " " | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//'
}

resolve_app_root() {
  local requested="${1:-}"
  local candidate

  if [[ -n "${requested}" ]]; then
    if [[ -d "${requested}" && -f "${requested}/openclaw.mjs" ]]; then
      (cd "${requested}" && pwd)
      return 0
    fi
    add_blocker "Requested APP_ROOT invalid or missing openclaw.mjs: ${requested}"
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

write_lines_file() {
  local out_file="$1"
  shift || true
  : > "${out_file}"
  if [[ "$#" -gt 0 ]]; then
    printf "%s\n" "$@" > "${out_file}"
  fi
}

APP_ROOT="$(resolve_app_root "${1:-}")" || {
  echo '{"error":"Unable to resolve APP_ROOT with openclaw.mjs"}'
  exit 2
}

if [[ ! -f "${APP_ROOT}/openclaw.mjs" ]]; then
  echo '{"error":"Resolved APP_ROOT does not contain openclaw.mjs"}'
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

HEAD_SHA=""
AGENTS_JSON="[]"
CONFIG_AGENTS_JSON="[]"
RUNTIME_MAP_JSON="{}"
SMOKE_OUTPUT=""
SMOKE_RC=0

cd "${APP_ROOT}"

add_command "git -C ${APP_ROOT} pull --rebase --autostash origin main"
if ! pull_out="$(git -C "${APP_ROOT}" pull --rebase --autostash origin main 2>&1)"; then
  add_blocker "Git pull failed: $(compact_line "${pull_out}")"
  add_next_action "Verify git remote/credentials and rerun git pull --rebase --autostash origin main."
fi

add_command "git -C ${APP_ROOT} rev-parse --short HEAD"
if ! HEAD_SHA="$(git -C "${APP_ROOT}" rev-parse --short HEAD 2>/dev/null)"; then
  HEAD_SHA="unknown"
  add_blocker "Unable to resolve HEAD SHA."
fi

add_command "node ${APP_ROOT}/openclaw.mjs agents list --json"
if ! AGENTS_JSON="$(node "${APP_ROOT}/openclaw.mjs" agents list --json 2>&1)"; then
  add_blocker "agents list failed: $(compact_line "${AGENTS_JSON}")"
  AGENTS_JSON="[]"
  add_next_action "Fix node/openclaw CLI runtime so agents list can be read."
fi

add_command "node ${APP_ROOT}/openclaw.mjs config get agents.list --json"
if ! CONFIG_AGENTS_JSON="$(node "${APP_ROOT}/openclaw.mjs" config get agents.list --json 2>&1)"; then
  add_blocker "config get agents.list failed: $(compact_line "${CONFIG_AGENTS_JSON}")"
  CONFIG_AGENTS_JSON="[]"
  add_next_action "Fix config access and rerun with node openclaw.mjs config get agents.list --json."
fi

add_command "cat ${APP_ROOT}/execution/agent_runtime_map.json"
if [[ -f "${APP_ROOT}/execution/agent_runtime_map.json" ]]; then
  RUNTIME_MAP_JSON="$(cat "${APP_ROOT}/execution/agent_runtime_map.json")"
else
  add_blocker "Missing runtime map: ${APP_ROOT}/execution/agent_runtime_map.json"
  add_next_action "Restore execution/agent_runtime_map.json from repository."
fi

ZEROCLAW_BIN="${HB_ZEROCLAW_BIN:-${HOME}/.cargo/bin/zeroclaw}"
NANOBOT_BIN="${HB_NANOBOT_BIN:-${APP_ROOT%/openclaw_app}/agent_runtimes/NanoBot/.venv/bin/nanobot}"
NANOBOT_PY="$(dirname "${NANOBOT_BIN}")/python"

if [[ ! -x "${ZEROCLAW_BIN}" ]]; then
  add_blocker "Missing runtime binary: zeroclaw (${ZEROCLAW_BIN})"
  add_next_action "Run ./scripts/install-specialist-runtimes.sh \"${APP_ROOT}\"."
  add_next_action "Install zeroclaw and/or set HB_ZEROCLAW_BIN to a valid binary path."
fi
if [[ ! -x "${NANOBOT_BIN}" && ! -x "${NANOBOT_PY}" ]]; then
  add_blocker "Missing runtime binary: nanobot (${NANOBOT_BIN}) and python shim (${NANOBOT_PY})"
  add_next_action "Run ./scripts/install-specialist-runtimes.sh \"${APP_ROOT}\"."
  add_next_action "Install NanoBot runtime venv under agent_runtimes/NanoBot/.venv or set HB_NANOBOT_BIN."
fi

add_command "python3 ${APP_ROOT}/execution/smoke_test_specialists.py"
set +e
SMOKE_OUTPUT="$(python3 "${APP_ROOT}/execution/smoke_test_specialists.py" 2>&1)"
SMOKE_RC=$?
set -e

if [[ "${SMOKE_RC}" -ne 0 ]]; then
  add_blocker "Smoke test failed (exit ${SMOKE_RC}): $(compact_line "${SMOKE_OUTPUT}")"
  if printf "%s" "${SMOKE_OUTPUT}" | rg -q "\.venv/bin/python.*No such file or directory"; then
    add_blocker "Environment blocker: stale .venv python path was referenced."
    add_next_action "Run smoke tests with system python3 and repair stale interpreter pointers."
  fi
  add_next_action "Fix runtime blockers and rerun python3 execution/smoke_test_specialists.py."
fi

if [[ "${#NEXT_ACTIONS[@]}" -eq 0 ]]; then
  add_next_action "No action required; runtime readiness checks passed."
fi

printf "%s" "${AGENTS_JSON}" > "${TMP_DIR}/agents.json"
printf "%s" "${CONFIG_AGENTS_JSON}" > "${TMP_DIR}/config_agents.json"
printf "%s" "${RUNTIME_MAP_JSON}" > "${TMP_DIR}/runtime_map.json"
printf "%s" "${SMOKE_OUTPUT}" > "${TMP_DIR}/smoke_output.txt"
write_lines_file "${TMP_DIR}/blockers.txt" "${BLOCKERS[@]}"
write_lines_file "${TMP_DIR}/next_actions.txt" "${NEXT_ACTIONS[@]}"
write_lines_file "${TMP_DIR}/commands_run.txt" "${COMMANDS_RUN[@]}"

APP_ROOT="${APP_ROOT}" \
HEAD_SHA="${HEAD_SHA}" \
SMOKE_RC="${SMOKE_RC}" \
TMP_DIR="${TMP_DIR}" \
node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const tmpDir = process.env.TMP_DIR;
const appRoot = process.env.APP_ROOT || null;
const headSha = process.env.HEAD_SHA || "unknown";
const smokeRc = Number(process.env.SMOKE_RC || "1");

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

const readLines = (file) => {
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const agents = readJson(path.join(tmpDir, "agents.json"), []);
const configAgents = readJson(path.join(tmpDir, "config_agents.json"), []);
const runtimeMap = readJson(path.join(tmpDir, "runtime_map.json"), {});
const smokeRaw = (() => {
  try {
    return fs.readFileSync(path.join(tmpDir, "smoke_output.txt"), "utf8");
  } catch {
    return "";
  }
})();

const blockers = readLines(path.join(tmpDir, "blockers.txt"));
const nextActions = readLines(path.join(tmpDir, "next_actions.txt"));
const commandsRun = readLines(path.join(tmpDir, "commands_run.txt"));

const requiredNew = [
  "knowledge-management",
  "strategic-horizon-systems",
  "operational-diagnostics-optimization",
  "creative-director",
];

const agentIds = new Set((Array.isArray(agents) ? agents : []).map((a) => a?.id).filter(Boolean));
const new4Present = requiredNew.every((id) => agentIds.has(id));

const hb = (Array.isArray(configAgents) ? configAgents : []).find((a) => a?.id === "honeybadger");
const hbAllowAgents = hb?.subagents?.allowAgents ?? "not-found";

const runtimeMapAgents = {};
for (const [agentId, cfg] of Object.entries(runtimeMap?.agents || {})) {
  runtimeMapAgents[agentId] = cfg?.runtime ?? null;
}

let smokeStatus = "UNKNOWN";
let smokeParsed = null;
try {
  smokeParsed = JSON.parse(smokeRaw);
} catch {
  smokeParsed = null;
}
if (smokeRc === 0 && smokeParsed?.ok === true) {
  smokeStatus = `PASS (${smokeParsed.mode || "unknown"})`;
} else if (smokeParsed && typeof smokeParsed.failedCount === "number") {
  smokeStatus = `FAILED (${smokeParsed.mode || "unknown"}, failedCount=${smokeParsed.failedCount})`;
} else if (smokeRc !== 0) {
  smokeStatus = `FAILED (exit=${smokeRc})`;
}

const result = {
  APP_ROOT: appRoot,
  HEAD_SHA: headSha,
  AGENT_COUNT: Array.isArray(agents) ? agents.length : 0,
  NEW_4_PRESENT: new4Present,
  HB_ALLOWAGENTS: hbAllowAgents,
  RUNTIME_MAP_AGENTS: runtimeMapAgents,
  SMOKE_TEST_STATUS: smokeStatus,
  BLOCKERS: blockers,
  NEXT_ACTIONS: nextActions,
  COMMANDS_RUN: commandsRun,
};

console.log(JSON.stringify(result, null, 2));
NODE
