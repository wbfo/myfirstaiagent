#!/bin/bash

# OpenClaw IONOS Deployment Script
# Automates the extraction, upload, and restart process for IONOS Cloud.

set -e

echo "🚀 Starting IONOS Deployment..."

# 1. Build the project
echo "📦 Building project..."
pnpm build

# 2. Check for credentials
if [ -z "$IONOS_SFTP_HOST" ] || [ -z "$IONOS_SFTP_USER" ]; then
    echo "❌ Error: IONOS_SFTP_HOST and IONOS_SFTP_USER must be set."
    exit 1
fi

# 3. Deploy via ionos-node-cloud-deploy
echo "⬆️ Uploading to IONOS..."
npx ionos-node-cloud-deploy --host "$IONOS_SFTP_HOST" --user "$IONOS_SFTP_USER" --pass "$IONOS_SFTP_PASSWORD" --remote-path "$IONOS_REMOTE_PATH"

echo "✅ Deployment complete!"
