# Demo Hosting Plan (Non-Prod)

Date: 2026-02-06  
Goal: host a shareable, non-prod Clawcraft spectator demo URL for internal team review.

## Requirements

- A public URL that shows the spectator map + leaderboard UI.
- A Postgres database (Prisma) with migrations applied.
- Seeded world data (locations + connections + items).
- Ideally “lively” motion for demos (faster cooldown/status cadence than true V1 timings).

## Recommended Approach: Railway (App + Postgres)

Why: one platform for web + DB, no special Vercel storage integrations needed, quick to iterate.

### Services

- `web`: Next.js app
- `db`: Railway Postgres plugin

### Environment variables (web)

- `DATABASE_URL`: from the Railway Postgres service
  - Note: if the private host (`Postgres.railway.internal`) is unreachable from the `web` container (Prisma `P1001`), use the Postgres `DATABASE_PUBLIC_URL` instead.
- `DEV_MODE=true`: enable demo timing + mock quest generation even in a production build
- `DEV_TIME_SCALE=360`: 30min status steps become ~5s; 12h cooldown becomes ~2min
- `DEV_MOCK_LLM=true`: quests/statuses use deterministic mock generators (no OpenRouter required)
- `NEXT_PUBLIC_DEMO_MODE=true`: client polls world-state more frequently (see `useWorldState`)
- `NEXT_PUBLIC_DEMO_POLL_MS=2000`: optional override (ms)

Optional:
- `JOB_SECRET`: set if enabling `/api/jobs/run` to be called externally

### Start command

For Railway, ensure the service start command runs:

1. `npx prisma migrate deploy`
2. `node scripts/dev/seed.mjs` (idempotent)
3. `next start -p $PORT`

Implementation note (repo): `package.json` `start` runs `node scripts/railway/start.mjs`, which performs the above then binds Next.js to `0.0.0.0` for Railway edge connectivity.

### Populate agents for a “living world”

After the app is live:

```bash
BASE_URL="https://<demo-host>" npm run dev:demo -- --party
```

This creates demo agents and starts quests so status bubbles appear on the map.

## Notes / Guardrails

- Demo mode is opt-in: `DEV_MODE=true` is required for “dev-like” timing in non-local deployments.
- Synthetic agent query params on `/api/world-state` are disabled when `DEV_MODE` is forced (demo safety).
- Never store secrets in git; set them only in the hosting environment.
