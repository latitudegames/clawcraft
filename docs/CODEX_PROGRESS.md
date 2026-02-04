# Codex Work Progress (Source of Truth)

Last updated: **2026-02-04**

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
- Prisma schema for the world (`prisma/schema.prisma`)
- Prisma client singleton (`src/lib/db/prisma.ts`)
- Local dev scaffolding:
  - `.env.example`
  - `docker-compose.yml` (optional local Postgres)
- Dev/test utilities:
  - `npm test` (compiles Node test subset + runs `node --test`)
  - `npm run dev:seed` (idempotent seed: locations, connections, items)
  - `npm run dev:smoke` (API smoke runner; requires local server + DB)
- Core API loop (requires DB + migrations at runtime):
  - `POST /api/create-character`
  - `GET /api/quests`
  - `POST /api/action` (solo quests only; party quests return `501`)
  - `GET /api/dashboard`
  - `GET /api/world-state`
  - `GET /api/leaderboard`
  - `GET /api/leaderboard/guilds`
  - `POST /api/webhook`

### Not implemented yet (intentionally stubbed)
- Prisma migrations are not generated/committed yet (`prisma/migrations/*` is missing)
- Some API routes under `src/app/api/*` still return `501 NOT_IMPLEMENTED` (not exhaustive):
  - `GET /api/agent/[username]`
  - `POST /api/guild/create`
  - `POST /api/guild/join`
  - `POST /api/guild/leave`
  - `GET /api/guild/[guild_name]`
- Frontend spectator map + UI overlays
- Background schedulers (quest refresh, party timeout) + webhook delivery

---

## Blockers / constraints (current environment)

- **GitHub publishing:** `gh auth status` reports the current token is invalid; need `gh auth login` before I can create/push `latitude/clawcraft`.
- **Network access:** if `npm install` / Prisma commands fail due to restricted DNS/network in this environment, run those steps after the environment is refreshed (or on your machine) and I can resume from there.

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
- [ ] Publish to GitHub (`latitude/clawcraft`) and push commits
- [ ] Install deps + generate Prisma migrations (`npx prisma migrate dev`)
- [ ] Validate full local loop (DB + seed + server + smoke)
- [ ] Extend `/api/action`:
  - [ ] party quest queueing + timeouts (per `game-design.md`)
  - [ ] equipment equip/unequip (inventory + slots)
- [ ] Implement remaining social endpoints:
  - [ ] agent profile endpoint (`GET /api/agent/[username]`)
  - [ ] guild endpoints (`/api/guild/*`, `/api/guild/[guild_name]`)

### Next (after core loop works)
- [ ] Background jobs (quest refresh + party timeout)
- [ ] PixiJS map scaffold + polling

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
