# Directive: IONOS Cloud Deployment

## Goal

Deploy the OpenClaw project to IONOS Cloud infrastructure.

## Deployment Strategy

We use `ionos-node-cloud-deploy` for automated deployment. This tool handles:

1. SFTP file transfer to the remote host.
2. Installation of dependencies via `pnpm`.
3. Process management and restarts.

## Configuration

The deployment configuration is maintained in `openclaw_app/ionos-config.json` (to be created with user credentials).

## Pre-deployment Checklist

1. Ensure `ionos-node-cloud-deploy` is installed: `pnpm list ionos-node-cloud-deploy`.
2. Verify local build: `pnpm build`.
3. Set environment variables for credentials:
   - `IONOS_SFTP_HOST`
   - `IONOS_SFTP_USER`
   - `IONOS_SFTP_PASSWORD`
   - `IONOS_REMOTE_PATH`

## Deployment Command

Run the automation script:

```bash
bash scripts/deploy-ionos.sh
```

## Security

> [!CAUTION]
> NEVER commit `.env` files or `ionos-config.json` containing raw passwords to the repository. Use environment variables in the CI/CD pipeline or local environment.
