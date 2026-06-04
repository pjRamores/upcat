#!/usr/bin/env bash
# deploy-cloudflare.sh -- Deploy UPCAT Simulator to Cloudflare Pages
#
# Steps:
#   1. Build the Vite frontend
#   2. Build the API
#   3. Deploy to Cloudflare Pages using Wrangler
#
# Required environment variables:
#   CLOUDFLARE_API_TOKEN - API token for Cloudflare
#   CLOUDFLARE_ACCOUNT_ID - Your Cloudflare Account ID
#   CLOUDFLARE_PROJECT_NAME - Project name in Cloudflare Pages
#
# Optional:
#   DEPLOY_ENV - "production" or "staging", default "production"
#
set -eou pipefail

: "${CLOUDFLARE_API_TOKEN:?missing CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?missing CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_PROJECT_NAME:?missing CLOUDFLARE_PROJECT_NAME}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🏗️ Installing dependencies"
npm ci

echo "🏗️ Building frontend"
npm run build --workspace=client

echo "🏗️ Building API"
npm run build --workspace=api

echo "🏗️ Deploying to Cloudflare Pages (environment=$DEPLOY_ENV)"

# Export environment variables for Wrangler
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# Deploy using Wrangler (requires wrangler CLI to be installed)
# If deploying via GitHub Actions, use the official GitHub Action instead:
# https://github.com/cloudflare/wrangler-action
if command -v wrangler &> /dev/null; then
  if [ "$DEPLOY_ENV" = "staging" ]; then
    wrangler deploy \
      --env staging \
      --project-name "$CLOUDFLARE_PROJECT_NAME-staging" \
      --outdir client/dist
  else
    wrangler deploy \
      --env production \
      --project-name "$CLOUDFLARE_PROJECT_NAME" \
      --outdir client/dist
  fi
else
  echo "⚠️ Wrangler CLI not found"
  echo "For local deployments, install: npm install -g wrangler"
  echo "For CI/CD, use the GitHub Action: cloudflare/wrangler-action"
  exit 1
fi

echo "✅ Cloudflare Pages deployment complete"
echo "👀 Visit: https://${CLOUDFLARE_PROJECT_NAME}.pages.dev"