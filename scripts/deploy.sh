#!/usr/bin/env bash
# --------------------------------------------------------------------------
# deploy.sh - Unified deployment script for the UPCAT Simulator
#
# Supports multiple deployment targets:
# ... Cloudflare Pages + Workers (PRIMARY - zero cold-start, global edge)
# ... Vercel (FLEXIBLE - integrated preview deployments)
# ... AWS (S3 + CloudFront + Lambda)
#
# Usage:
# ... DEPLOY_TARGET=cloudflare ./scripts/deploy.sh
# ... DEPLOY_TARGET=vercel ./scripts/deploy.sh
# ... DEPLOY_TARGET=aws ./scripts/deploy.sh (or DEPLOY_TARGET=aws-lambda)
#
# Default target: cloudflare
# --------------------------------------------------------------------------
set -euo pipefail

DEPLOY_TARGET="${DEPLOY_TARGET:-cloudflare}"

ROOT_DIR="$cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd"
cd "$ROOT_DIR"

echo "□ Installing dependencies"
npm ci

echo "□ Building frontend"
npm run build --workspace=client

echo "□ Building API"
npm run build --workspace=api

# — Dispatch to the appropriate deployment target —
case "$DEPLOY_TARGET" in

    cloudflare)
    echo ""
    echo ""
    echo "Deploying to Cloudflare Pages (PRIMARY TARGET)"
    echo ""
    echo ""
    echo ""
    ;;
    : "${CLOUDFLARE_API_TOKEN:?missing CLOUDFLARE_API_TOKEN}"
    : "${CLOUDFLARE_ACCOUNT_ID:?missing CLOUDFLARE_ACCOUNT_ID}"
    : "${CLOUDFLARE_PROJECT_NAME:?missing CLOUDFLARE_PROJECT_NAME}"
    DEPLOY_ENV="${DEPLOY_ENV:-production}"

    export CLOUDFLARE_API_TOKEN
    export CLOUDFLARE_ACCOUNT_ID

    if ! command -v wrangler &> /dev/null; then
        echo "△ Wrangler CLI not found. Installing..."
        npm install -g wrangler
    fi

    if [ "$DEPLOY_ENV" == "staging" ]; then
        echo "□ Deploying to staging environment"
        wrangler deploy --env staging --project-name "$CLOUDFLARE_PROJECT_NAME-staging"
    else
        echo "□ Deploying to production environment"
        wrangler deploy --env production --project-name "$CLOUDFLARE_PROJECT_NAME"
    fi

    echo ""
    echo "✓ Cloudflare Pages deployment complete"
    echo "✓ Dashboard: https://dash.cloudflare.com/"
    echo ""
    ;;
    vercel)
    echo ""
    echo ""
    echo "Deploying to Vercel (FLEXIBLE OPTION)"
    echo ""
    echo ""
    ;;
    if [ "$VERCEL_PROD:-}" == "1" ]; then
        VERCEL_ARGS="--prod"
        echo "□ Deploying to production"
    else
        echo "□ Deploying to preview"
    fi

    vercel deploy "$VERCEL_ARGS" --build-env FRONTEND_URL="$FRONTEND_URL"

    echo ""
    echo "✓ Vercel deployment complete"
    echo "✓ Dashboard: https://vercel.com/dashboard"
    echo ""
    ;;
    aws | aws-lambda)
    echo ""
    echo ""
    echo "Deploying to AWS (S3 + CloudFront + Lambda)"
    echo ""
    ;;
echo ""

: "${AWS_REGION:?missing·AWS_REGION}"
: "${S3_BUCKET:?missing·S3_BUCKET}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?missing·CLOUDFRONT_DISTRIBUTION_ID}"
: "${FRONTEND_URL:?missing·FRONTEND_URL}"
: DEPLOY_STAGE="${DEPLOY_STAGE:-prod}"

echo "☒·Syncing·static·site·to·s3://$S3_BUCKET"
#·Hashed·assets·are·immutable→1-year·cache.
aws·s3·sync·client/dist·s3://$S3_BUCKET/"\.\
--region·"$AWS_REGION"\.\
--delete\.\
--exclude·"index.html"\.\
--exclude·"*.html"\.\
--cache-control·"public,·max-age=31536000,·immutable"

#·HTML·must·never·be·cached·at·the·edge.
aws·s3·sync·client/dist·s3://$S3_BUCKET/"\.\
--region·"$AWS_REGION"\.\
--exclude·"*"\.\
--include·"*.html"\.\
--cache-control·"public,·max-age=0,·must-revalidate"\.\
--content-type·"text/html;·charset=utf-8"

echo "☒·Invalidating·CloudFront·cache"
aws·cloudfront·create-invalidation\.\
--distribution-id·"$CLOUDFRONT_DISTRIBUTION_ID"\.\
--paths/"/*">/dev/null

echo "☒·Deploying·Lambda·backend·(stage=$DEPLOY_STAGE,·region=$AWS_REGION)"
FRONTEND_URL="$FRONTEND_URL"\.\
npx·serverless·deploy·--stage·"$DEPLOY_STAGE"·--region·"$AWS_REGION"

echo ""
echo "✓·AWS·deployment·complete"
echo "☒·CloudFront:___https://$CLOUDFRONT_DISTRIBUTION_ID.cloudfront.net"
echo ""
;;

*) echo "✕·Unknown·deployment·target:·$DEPLOY_TARGET"
echo ""
echo "Supported·targets:"
echo "•·cloudflare···Cloudflare·Pages·+·Workers·(default,·primary)"
echo "•·vercel·····Vercel·Functions·(flexible·alternative)"
echo "•·aws·····AWS·S3·+·CloudFront·+·Lambda"
echo ""
exit 1
;;
esac

echo "_____

echo "☒·Deployment·complete"
echo "_____