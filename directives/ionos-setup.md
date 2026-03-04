# Directive: IONOS Deployment

## Goal

Deploy OpenClaw to IONOS with a repeatable workflow.

## Deployment Modes

- `vps` (recommended): run deployment on an IONOS VPS over SSH.
- `sftp` (legacy): upload using `ionos-node-cloud-deploy`.

`scripts/deploy-ionos.sh` auto-detects mode:
- If `IONOS_SFTP_*` variables are set, it uses `sftp`.
- Otherwise, it defaults to `vps`.
- You can force mode with `IONOS_DEPLOY_MODE=vps|sftp`.

## VPS Workflow (GitHub Actions)

Workflow file: `.github/workflows/deploy-ionos-vps.yml`

Required repository secrets:

1. `IONOS_SSH_HOST`
2. `IONOS_SSH_USER`
3. `IONOS_SSH_PORT`
4. `IONOS_SSH_PRIVATE_KEY`
5. `IONOS_DEPLOY_PATH`
6. Optional: `IONOS_SSH_KNOWN_HOSTS`

Remote server expectations:

1. `IONOS_DEPLOY_PATH` exists and is a git checkout of this repository.
2. Docker + Docker Compose plugin are installed.
3. `docker compose` can run without sudo in that user context.
4. `.env` in `IONOS_DEPLOY_PATH` is configured for OpenClaw runtime values.

Manual remote deploy command:

```bash
./scripts/deploy-ionos.sh openclaw-gateway
```

## SFTP Workflow (Legacy)

Required env vars:

- `IONOS_SFTP_HOST`
- `IONOS_SFTP_USER`
- `IONOS_SFTP_PASSWORD`
- `IONOS_REMOTE_PATH`

Command:

```bash
IONOS_DEPLOY_MODE=sftp ./scripts/deploy-ionos.sh
```

## Security

> [!CAUTION]
> Never commit `.env` files or raw deployment credentials to the repository.
