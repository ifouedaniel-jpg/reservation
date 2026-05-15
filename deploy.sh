#!/usr/bin/env bash
# Manual fallback — normal deployments are handled by GitHub Actions (build in CI, rsync to VPS).
# Run this only if you need to trigger post-deploy steps manually on the VPS.
set -euo pipefail

APP_DIR="/var/www/reservation"
PM2_APP_NAME="reservation"

cd "$APP_DIR"

echo "[deploy] Running database migrations..."
npx prisma migrate deploy

echo "[deploy] Pruning dev dependencies..."
npm prune --production

echo "[deploy] Restarting app..."
pm2 restart "$PM2_APP_NAME"

echo "[deploy] Done."
