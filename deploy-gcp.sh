#!/usr/bin/env bash
set -euo pipefail

# OpenClaw GCP Cloud Run Deployment Script 🦞

# --- Configuration ---
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
REGION="us-central1"
SERVICE_NAME="honey-badger-gateway"
REPO_NAME="openclaw-repo"
IMAGE_TAG="latest"

# --- Colors ---
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🦞 Starting OpenClaw GCP Deployment Sequence...${NC}"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP Project ID found. Please run 'gcloud config set project [PROJECT_ID]'${NC}"
    exit 1
fi

echo "Using Project ID: $PROJECT_ID"

# 1. Enable API Services
echo -e "${BLUE}Step 1: Enabling required GCP APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    storage-api.googleapis.com \
    storage-component.googleapis.com

# 2. Storage Bucket for Persistence
BUCKET_NAME="${PROJECT_ID}-openclaw-data"
if ! gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
    echo -e "${BLUE}Step 2: Creating GCS Bucket for persistence: ${BUCKET_NAME}...${NC}"
    gsutil mb -l "${REGION}" "gs://${BUCKET_NAME}"
else
    echo -e "${BLUE}Step 2: GCS Bucket already exists.${NC}"
fi

# 3. Artifact Registry
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" >/dev/null 2>&1; then
    echo -e "${BLUE}Step 3: Creating Artifact Registry: ${REPO_NAME}...${NC}"
    gcloud artifacts repositories create "${REPO_NAME}" \
        --repository-format=docker \
        --location="${REGION}" \
        --description="OpenClaw Docker Repository"
else
    echo -e "${BLUE}Step 3: Artifact Registry already exists.${NC}"
fi

# 4. Build and Push
echo -e "${BLUE}Step 4: Building and Pushing Container Image...${NC}"
gcloud builds submit --tag "${IMAGE_URL}" .

# 5. Deploy to Cloud Run
echo -e "${BLUE}Step 5: Deploying to Cloud Run...${NC}"
# Note: We use --execution-environment gen2 for GCS FUSE support
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_URL}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --execution-environment gen2 \
    --update-env-vars "OPENCLAW_STATE_DIR=/data,OPENCLAW_WORKSPACE_DIR=/data/workspace" \
    --add-cloudstorage-mount "mount-path=/data,bucket=${BUCKET_NAME}" \
    --port 18789

echo -e "${BLUE}🦞 Deployment Complete!${NC}"
gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)'
