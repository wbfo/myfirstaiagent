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
  architect
  researcher
  deal-closer
  market-advisory
  ops-coordinator
  quality-gate
)

agents_json="$(node openclaw.mjs agents list --json)"

for id in "${TARGET_IDS[@]}"; do
  if [[ "${id}" == "main" ]]; then
    continue
  fi
  exists="$(printf '%s' "${agents_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const list=JSON.parse(s);const id=process.argv[1];console.log(list.some(a=>a.id===id)?"1":"0");});' "${id}")"
  if [[ "${exists}" != "1" ]]; then
    node openclaw.mjs agents add "${id}" --workspace "${WORKSPACE}" --non-interactive >/dev/null
    agents_json="$(node openclaw.mjs agents list --json)"
  fi
done

for id in "${TARGET_IDS[@]}"; do
  idx="$(printf '%s' "${agents_json}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const list=JSON.parse(s);const id=process.argv[1];console.log(list.findIndex(a=>a.id===id));});' "${id}")"
  if [[ "${idx}" == "-1" ]]; then
    echo "Agent missing after sync: ${id}" >&2
    exit 1
  fi
  node openclaw.mjs config set "agents.list[${idx}].workspace" "${WORKSPACE}" >/dev/null
done

echo "Synced runtime agent roster to workspace: ${WORKSPACE}"
node openclaw.mjs agents list --json
