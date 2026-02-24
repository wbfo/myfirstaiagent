#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE="${1:-${REPO_ROOT}}"

cd "${REPO_ROOT}"

if [[ ! -d "${WORKSPACE}" ]]; then
  echo "Workspace does not exist: ${WORKSPACE}" >&2
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/openclaw.mjs" ]]; then
  echo "Run this script from the openclaw_app repository." >&2
  exit 1
fi

TARGET_IDS=(
  main
  honeybadger
  knowledge-management
  strategic-horizon-systems
  operational-diagnostics-optimization
  creative-director
  architect
  researcher
  deal-closer
  market-advisory
  ops-coordinator
  quality-gate
)

json_quote() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1] ?? ""));' "$1"
}

agent_name() {
  case "$1" in
    main) echo "Main Assistant" ;;
    honeybadger) echo "HoneyBadger Orchestrator" ;;
    knowledge-management) echo "Knowledge Management Agent" ;;
    strategic-horizon-systems) echo "Strategic Horizon and Systems Agent" ;;
    operational-diagnostics-optimization) echo "Operational Diagnostics and Optimization Agent" ;;
    creative-director) echo "Creative Director Agent" ;;
    architect) echo "Architect" ;;
    researcher) echo "Researcher" ;;
    deal-closer) echo "Deal Closer" ;;
    market-advisory) echo "Market Advisory" ;;
    ops-coordinator) echo "Ops Coordinator" ;;
    quality-gate) echo "Quality Gate" ;;
    *) echo "$1" ;;
  esac
}

agent_model_json() {
  case "$1" in
    main|honeybadger|ops-coordinator|quality-gate)
      echo '{"primary":"google/gemini-3-flash-preview","fallbacks":["google/gemini-2.5-flash"]}'
      ;;
    architect|researcher)
      echo '{"primary":"google/gemini-2.5-pro","fallbacks":["google/gemini-3-flash-preview"]}'
      ;;
    strategic-horizon-systems|creative-director)
      echo '{"primary":"google/gemini-2.5-pro","fallbacks":["google/gemini-3-flash-preview"]}'
      ;;
    deal-closer)
      echo '{"primary":"google/gemini-2.5-flash","fallbacks":["google/gemini-3-flash-preview"]}'
      ;;
    knowledge-management|operational-diagnostics-optimization)
      echo '{"primary":"google/gemini-2.5-flash","fallbacks":["google/gemini-3-flash-preview"]}'
      ;;
    market-advisory)
      echo '{"primary":"openai/gpt-4o-mini","fallbacks":["google/gemini-2.5-flash"]}'
      ;;
    *)
      echo ''
      ;;
  esac
}

agent_subagents_json() {
  case "$1" in
    main)
      echo '{"allowAgents":["*"]}'
      ;;
    honeybadger)
      echo '{"allowAgents":["knowledge-management","ops-coordinator","quality-gate","strategic-horizon-systems","operational-diagnostics-optimization","creative-director","architect","researcher","deal-closer","market-advisory"]}'
      ;;
    *)
      echo ''
      ;;
  esac
}

refresh_agents_json() {
  agents_json="$(node openclaw.mjs agents list --json)"
}

agent_index() {
  local id="$1"
  printf '%s' "${agents_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const list=JSON.parse(s);const id=process.argv[1];console.log(list.findIndex(a=>a.id===id));});' "${id}"
}

set_config() {
  local path="$1"
  local value="$2"
  node openclaw.mjs config set "${path}" "${value}" >/dev/null
}

agents_json=""
refresh_agents_json

for id in "${TARGET_IDS[@]}"; do
  exists="$(printf '%s' "${agents_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const list=JSON.parse(s);const id=process.argv[1];console.log(list.some(a=>a.id===id)?"1":"0");});' "${id}")"
  if [[ "${exists}" != "1" ]]; then
    node openclaw.mjs agents add "${id}" --workspace "${WORKSPACE}" --non-interactive >/dev/null
    refresh_agents_json
  fi
done

for id in "${TARGET_IDS[@]}"; do
  idx="$(agent_index "${id}")"
  if [[ "${idx}" == "-1" ]]; then
    echo "Agent missing after sync: ${id}" >&2
    exit 1
  fi

  set_config "agents.list[${idx}].workspace" "$(json_quote "${WORKSPACE}")"
  set_config "agents.list[${idx}].name" "$(json_quote "$(agent_name "${id}")")"

  model_json="$(agent_model_json "${id}")"
  if [[ -n "${model_json}" ]]; then
    set_config "agents.list[${idx}].model" "${model_json}"
  fi

  subagents_json="$(agent_subagents_json "${id}")"
  if [[ -n "${subagents_json}" ]]; then
    set_config "agents.list[${idx}].subagents" "${subagents_json}"
  fi

  set_config "agents.list[${idx}].default" "false"
done

hb_idx="$(agent_index "honeybadger")"
if [[ "${hb_idx}" == "-1" ]]; then
  echo "HoneyBadger missing after sync." >&2
  exit 1
fi
set_config "agents.list[${hb_idx}].default" "true"

set_config "agents.defaults.maxConcurrent" "4"
set_config "agents.defaults.subagents.maxConcurrent" "8"
set_config "agents.defaults.subagents.maxSpawnDepth" "2"
set_config "agents.defaults.subagents.model" "$(json_quote "google/gemini-2.5-flash")"

echo "Synced and configured HoneyBadger runtime to workspace: ${WORKSPACE}"

node - <<'NODE'
const { execSync } = require("node:child_process");

const agents = JSON.parse(execSync("node openclaw.mjs agents list --json", { encoding: "utf8" }));
const rows = [];

for (const agent of agents) {
  const modelStatus = JSON.parse(
    execSync(`node openclaw.mjs models status --json --agent ${agent.id}`, { encoding: "utf8" }),
  );
  rows.push({
    id: agent.id,
    default: agent.isDefault === true,
    workspace: agent.workspace,
    model: modelStatus.resolvedDefault || modelStatus.defaultModel || null,
  });
}

console.log(JSON.stringify({ agents: rows }, null, 2));
NODE
