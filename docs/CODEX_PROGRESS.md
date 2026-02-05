# Codex Work Progress (Source of Truth)

Last updated: **2026-02-05**

This is the **living status + work log** for changes I make in this repo.

## Plan docs (high-level source of truth)
I must reference these for the authoritative plan/spec:
- `ROADMAP.md` — phased roadmap
- `game-design.md` — mechanics + API shapes/behavior
- `visual-design.md` — UI/art direction + component plan
- `docs/plans/2026-02-04-visual-assets-pipeline.md` — AI asset generation + background removal pipeline

Execution-level translation of those docs:
- `docs/CODEX_ROADMAP.md` — repo map + build order + dev-harness plan

---

## Snapshot: repo state right now

### Implemented
- Next.js app skeleton (`src/app/*`)
- Tailwind theme tokens (`tailwind.config.ts`, `src/app/globals.css`)
- Domain + API types (`src/types/*`)
- Deterministic RNG + formulas + mock quest/status generators (`src/lib/**`)
- Deterministic item drops by challenge rating (`src/lib/game/item-drops.ts`)
- Prisma schema for the world (`prisma/schema.prisma`)
- Prisma migrations committed (`prisma/migrations/*`)
- Prisma client singleton (`src/lib/db/prisma.ts`)
- Local dev scaffolding:
  - `.env.example`
  - `docker-compose.yml` (optional local Postgres)
- Dev/test utilities:
  - `npm test` (compiles Node test subset + runs `node --test`)
  - `npm run dev:seed` (idempotent seed: locations, connections, items)
  - `npm run dev:smoke` (API smoke runner; requires local server + DB)
    - Optional: `SMOKE_PARTY=1` (or `--party`) exercises party queueing/formation
  - Offline deterministic smoke (no DB/server): `npm run sim:smoke`
- CI: GitHub Actions runs lint/typecheck/tests/build (`.github/workflows/ci.yml`)
- Core API loop (requires DB + migrations at runtime):
  - `POST /api/create-character`
  - `GET /api/quests`
  - `POST /api/action` (solo + party queueing; supports equipment changes)
  - `GET /api/dashboard`
  - `GET /api/world-state`
  - `GET /api/leaderboard`
  - `GET /api/leaderboard/guilds`
  - `POST /api/webhook`
- Social endpoints (DB required at runtime):
  - `GET /api/agent/[username]`
  - `POST /api/guild/create`
  - `POST /api/guild/join`
  - `POST /api/guild/leave`
  - `GET /api/guild/[guild_name]`
  - Background jobs trigger (`GET|POST /api/jobs/run`) + CLI runner (`npm run dev:jobs`)
- Frontend spectator scaffold:
  - `/` renders PixiJS world map + polling (`/api/world-state`)
  - Speech bubble overlay anchored to agent markers (HTML overlay)
  - Bubble overlap mitigation (deterministic stacking + viewport clamping)
  - Zoom-based declutter (hide labels + reduce bubbles when zoomed out)
  - Agent sprites rendered on-map (starter set in `public/assets/agents/*`)
  - POI icons rendered on-map (starter set in `public/assets/poi/*`)
  - Location connection lines rendered (via `connections` in `/api/world-state`)
  - Map zoom controls (+/−/reset) + center-on-selected-agent button
  - Leaderboard panel (players/guilds tabs) wired to `/api/leaderboard*`
  - Click player row → focus map on agent + open agent modal (`GET /api/agent/[username]`)
  - Click agent marker on map → open agent modal

### Webhooks + background scheduling
- Webhook registration: `POST /api/webhook`
- Webhook delivery implemented:
  - `cycle_complete` sent when a quest run resolves (triggered via `resolveQuestRun`)
  - `party_formed` sent when a party quest fills and starts
  - `party_timeout` sent when a queued party expires (opportunistic + background job)
- Background jobs runner (`src/lib/server/jobs/run-jobs.ts`) currently performs:
  - resolve due quest runs (sends `cycle_complete` webhooks)
  - time out expired party queues (sends `party_timeout` webhooks)
  - refresh quests every 12h (dev-only, mock LLM)
- Production cron wiring:
  - `vercel.json` schedules `GET /api/jobs/run` every 10 minutes
  - Protect the endpoint by setting `CRON_SECRET` or `JOB_SECRET` (expects `Authorization: Bearer <secret>`)

### Not implemented yet (intentionally stubbed)
- Frontend spectator polish (terrain art, animation, bubble clustering)
- (Optional) Production ops polish (health checks, tracing)

---

## Blockers / constraints (current environment)

- Networking is working (able to `npm install` and `git push`).
- Local Postgres works via Docker (`docker compose up -d`). If `docker compose` is missing (common when `docker` is installed via Homebrew), install the plugin (`brew install docker-compose`) and add `cliPluginsExtraDirs` to `~/.docker/config.json` as per the Homebrew caveats.
- `npm audit` is down to **1 moderate** Next.js advisory; fully clearing requires a larger upgrade (Next 16 + ESLint 9) than is currently worth it.

---

## Working rules (how I’ll keep progress reliable)

1. **Spec-first**: if behavior is unclear, consult `game-design.md` before coding.
2. **Deterministic-by-default**: anything simulation-related must be reproducible via a seed.
3. **Contract-first APIs**: prefer `src/types/api.ts` shapes; update types as part of API changes.
4. **Dev harness early**: keep a fast “smoke loop” for endpoints so regressions are obvious.
5. **Small, verifiable steps**: every task should have a command or HTTP call that proves it works.

---

## Local dev quickstart (CLI-only)

1. Start Postgres (optional): `docker compose up -d`
2. Configure env: copy `.env.example` → `.env.local` (or `.env`)
3. Install deps: `npm install`
4. Create DB tables: `npx prisma migrate dev`
5. Seed base world: `npm run dev:seed`
6. Start server: `npm run dev`
7. Run smoke flow: `npm run dev:smoke`
   - Optional env overrides: `BASE_URL`, `USERNAME`, `LOCATION`

Offline smoke (no npm deps / no DB):
- `npm run sim:smoke`
  - Optional env override: `SIM_SEED`

---

## Status

### Now (next concrete milestones)
- [x] Publish to GitHub (`latitudegames/clawcraft`) and push commits
- [x] Install deps + generate Prisma migrations (offline diff; commit `prisma/migrations/*`)
- [x] Validate full local loop (DB + seed + server + smoke)
- [x] Extend `/api/action`:
  - [x] party quest queueing + timeouts (per `game-design.md`)
  - [x] equipment equip/unequip (inventory + slots)
- [x] Implement remaining social endpoints:
  - [x] agent profile endpoint (`GET /api/agent/[username]`)
  - [x] guild endpoints (`/api/guild/*`, `/api/guild/[guild_name]`)

### Next (after core loop works)
- [x] Add speech bubble overlay + reveal cadence (time-scaled in dev)
- [x] Add agent card modal + search/focus
- [ ] (Optional) Expand `scripts/dev/smoke.mjs` to cover party + guild (agent + jobs runner added)

### Done
- [x] Created `docs/CODEX_ROADMAP.md`
- [x] Created `docs/CODEX_PROGRESS.md`
- [x] Seed script (`npm run dev:seed`)
- [x] API smoke runner (`npm run dev:smoke`)
- [x] Offline sim smoke (`npm run sim:smoke`)

---

## Verification checklist (what “works” means)

Run locally:
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm run sim:smoke` (offline, no DB/Next required)

API sanity (once implemented):
- `POST /api/create-character` creates an agent
- `GET /api/quests?location=X` returns deterministic quests
- `POST /api/action` creates a run + statuses deterministically
- `GET /api/dashboard?username=X` matches `DashboardResponse` shape

Determinism checks:
- same seed inputs → identical quest IDs / multipliers / outcomes
- no “action-time” game logic depends on non-deterministic time without an explicit time/seed input

---

## Work log

### 2026-02-04
- Added `docs/CODEX_ROADMAP.md` (repo map + execution order + dev harness design)
- Added `docs/CODEX_PROGRESS.md` (this file)
- Added `docker-compose.yml` (optional local Postgres)
- Added `scripts/dev/smoke.mjs` + `npm run dev:smoke`
- Added `scripts/dev/seed.mjs` + `npm run dev:seed`
- Added `npm test` (Node-compiled subset test runner) + ignored `.tmp/`
- Implemented core deterministic helpers (progression, timing, quest resolution)
- Implemented core API loop endpoints (`/api/create-character`, `/api/quests`, `/api/action`, `/api/dashboard`)
- Implemented spectator support endpoints (`/api/world-state`, `/api/leaderboard`, `/api/leaderboard/guilds`) + webhook registration (`/api/webhook`)
- Remaining gaps: migrations, party quests, equipment handling, guild/agent endpoints, schedulers/UI

### 2026-02-05
- Updated Codex docs to be explicitly CLI-first and added a handoff prompt for the next Codex (`docs/CODEX_HANDOFF.md`)
- Networking works again (confirmed `curl`, `npm install`, `git push`)
- Fixed Prisma schema (`Guild.leaderId` unique), generated and committed initial migrations (`prisma/migrations/*`)
- Added deterministic modules + tests:
  - Equipment inventory/slot swap helpers (`src/lib/game/equipment.ts`)
  - Party quest resolution + queue helpers (`src/lib/game/quest-resolution.ts`, `src/lib/game/party-queue.ts`)
- Implemented + validated DB-backed API behavior:
  - `POST /api/action`: equipment changes + party quest queueing/formation
  - Social endpoints: `GET /api/agent/[username]`, `POST /api/guild/*`, `GET /api/guild/[guild_name]`
  - Verified locally: `docker compose up -d`, `npx prisma migrate dev`, `npm run dev:seed`, `npm run dev`, `npm run dev:smoke`
- Implemented deterministic item drops (persisted to inventory on quest resolution)
- Implemented webhook delivery for `cycle_complete`, `party_formed`, `party_timeout`
- Added background jobs runner (`POST /api/jobs/run`, `npm run dev:jobs`) to resolve due runs, time out party queues, and refresh quests (dev-only)
- Started spectator UI scaffold:
  - `/` polls `/api/world-state` and renders a PixiJS map (pan/zoom, POI + agent markers)
  - Added leaderboard panel (players/guilds tabs + search)
- Added spectator UI polish:
  - Speech bubble overlay (HTML) anchored to agent positions
  - Bubble overlap mitigation (deterministic stacking + viewport clamping)
  - Click leaderboard player → focus map on agent + open agent modal (skills, equipment, inventory, journey log, last quest)
  - Map zoom controls (+/−/reset) and a manual Center button
  - Leaderboard highlights the selected player; Enter selects the top search result
  - Click agent markers on the map to open the same agent modal
  - Agent modal shows a small sprite avatar (deterministic by username)
  - Starter pixel agent sprites rendered on the map (`public/assets/agents/*`, nearest-neighbor)
  - Starter POI icons rendered on the map (`public/assets/poi/*`)
  - Location connections included in `/api/world-state` and rendered as map lines
- Expanded API smoke script:
  - `scripts/dev/smoke.mjs` now also calls `GET /api/agent/[username]` and `POST /api/jobs/run`
  - Optional party flow (`SMOKE_PARTY=1` / `--party`) joins a party quest until it forms
- Chore: upgraded to Next.js `15.5.12` + adjusted App Router dynamic route handler params (`context.params` is now a `Promise` in Next 15).
- Added Vercel Cron config + `GET /api/jobs/run` support for production scheduling (`vercel.json`).
- Added zoom-based map declutter (labels + bubbles fade out when zoomed far out).
- Added CI workflow (`.github/workflows/ci.yml`) to keep main green.
