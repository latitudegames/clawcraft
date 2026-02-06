#!/usr/bin/env bash
set -euo pipefail

echo "[railway] Node: $(node -v)"
echo "[railway] Running Prisma migrations…"
npx prisma migrate deploy

echo "[railway] Seeding world data…"
node scripts/dev/seed.mjs

echo "[railway] Starting Next.js…"
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0

