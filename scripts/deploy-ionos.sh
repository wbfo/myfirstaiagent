#!/usr/bin/env bash

# OpenClaw IONOS deployment helper.
# Supports two modes:
# - vps: rebuild Docker image + restart compose service on an IONOS VPS.
# - sftp: legacy upload flow using ionos-node-cloud-deploy.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICE="${1:-openclaw-gateway}"
DEPLOY_MODE="${IONOS_DEPLOY_MODE:-auto}"

log() {
  printf "==> %s\n" "$*"
}

fail() {
  printf "ERROR: %s\n" "$*" >&2
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

resolve_mode() {
  case "${DEPLOY_MODE}" in
    auto)
      if [ -n "${IONOS_SFTP_HOST:-}" ] || [ -n "${IONOS_SFTP_USER:-}" ] || [ -n "${IONOS_SFTP_PASSWORD:-}" ] || [ -n "${IONOS_REMOTE_PATH:-}" ]; then
        printf "sftp\n"
      else
        printf "vps\n"
      fi
      ;;
    vps | sftp)
      printf "%s\n" "${DEPLOY_MODE}"
      ;;
    *)
      fail "IONOS_DEPLOY_MODE must be one of: auto, vps, sftp"
      ;;
  esac
}

load_env_file() {
  if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${ROOT_DIR}/.env"
    set +a
  fi
}

require_compose_service() {
  local service_name="$1"
  local services
  services="$(docker compose config --services)"
  if ! printf "%s\n" "${services}" | grep -Fx -- "${service_name}" >/dev/null; then
    fail "Service '${service_name}' is not defined in docker-compose.yml"
  fi
}

deploy_vps() {
  require_cmd docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required (run: docker compose version)"

  cd "${ROOT_DIR}"
  load_env_file
  require_compose_service "${SERVICE}"

  local image_name
  local apt_packages
  image_name="${OPENCLAW_IMAGE:-openclaw:local}"
  apt_packages="${OPENCLAW_DOCKER_APT_PACKAGES:-}"

  log "Building Docker image '${image_name}'"
  docker build \
    --build-arg "OPENCLAW_DOCKER_APT_PACKAGES=${apt_packages}" \
    -t "${image_name}" \
    -f "${ROOT_DIR}/Dockerfile" \
    "${ROOT_DIR}"

  log "Restarting service '${SERVICE}'"
  docker compose up -d "${SERVICE}"

  if [ "${SERVICE}" = "openclaw-gateway" ] && [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
    log "Running gateway health check"
    docker compose exec -T openclaw-gateway node dist/index.js health --token "${OPENCLAW_GATEWAY_TOKEN}"
  else
    log "Skipping health check (service=${SERVICE}, OPENCLAW_GATEWAY_TOKEN missing or non-gateway service)"
  fi

  log "Deployment complete (mode=vps)"
}

deploy_sftp() {
  require_cmd pnpm
  require_cmd npx

  [ -n "${IONOS_SFTP_HOST:-}" ] || fail "IONOS_SFTP_HOST must be set in sftp mode"
  [ -n "${IONOS_SFTP_USER:-}" ] || fail "IONOS_SFTP_USER must be set in sftp mode"
  [ -n "${IONOS_SFTP_PASSWORD:-}" ] || fail "IONOS_SFTP_PASSWORD must be set in sftp mode"
  [ -n "${IONOS_REMOTE_PATH:-}" ] || fail "IONOS_REMOTE_PATH must be set in sftp mode"

  cd "${ROOT_DIR}"
  log "Building project"
  pnpm build

  log "Uploading to IONOS via SFTP"
  npx ionos-node-cloud-deploy \
    --host "${IONOS_SFTP_HOST}" \
    --user "${IONOS_SFTP_USER}" \
    --pass "${IONOS_SFTP_PASSWORD}" \
    --remote-path "${IONOS_REMOTE_PATH}"

  log "Deployment complete (mode=sftp)"
}

MODE="$(resolve_mode)"
log "Starting IONOS deployment (mode=${MODE}, service=${SERVICE})"

case "${MODE}" in
  vps) deploy_vps ;;
  sftp) deploy_sftp ;;
esac
