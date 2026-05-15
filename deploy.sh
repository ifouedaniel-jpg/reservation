#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/reservation"
PM2_APP_NAME="reservation"

cd "$APP_DIR"

echo "[deploy] Pulling latest code..."
git pull origin main

echo "[deploy] Installing dependencies..."
npm ci

echo "[deploy] Building..."
npm run build

echo "[deploy] Running database migrations..."
npm run db:migrate

echo "[deploy] Restarting app..."
pm2 restart "$PM2_APP_NAME"

echo "[deploy] Done."
