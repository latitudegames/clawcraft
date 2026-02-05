# Codex Handoff (Read This First)

This doc is written for the **next Codex instance** so it can pick up work in this repo quickly and safely.

## Non-negotiables (source of truth)

Read these first:
- `ROADMAP.md` — phased plan (backend determinism first, frontend later)
- `game-design.md` — mechanics + API contracts/spec
- `visual-design.md` — UI/art direction + component architecture
- `docs/plans/2026-02-04-visual-assets-pipeline.md` — canonical visual asset pipeline (AI → background removal)

Execution docs (Codex-maintained):
- `docs/CODEX_ROADMAP.md` — file structure + build order + CLI dev harness
- `docs/CODEX_PROGRESS.md` — living progress log (what’s done/next/blocked)

If `docs/*` conflicts with plan docs above, plan docs win.

## Current state (what exists today)

### Key files to understand the backend
- DB schema: `prisma/schema.prisma` (Postgres; migrations not committed yet)
- Prisma client: `src/lib/db/prisma.ts`
- Deterministic game logic:
  - `src/lib/utils/rng.ts`
  - `src/lib/game/formulas.ts`
  - `src/lib/game/quest-resolution.ts`
  - `src/lib/game/quest-effects.ts`
  - `src/lib/game/timing.ts`
  - `src/lib/game/character.ts`
- Deterministic “mock LLM” (dev-only content generator):
  - `src/lib/ai/mock-llm.ts`
- Run resolver (applies rewards + moves agent):
  - `src/lib/server/resolve-quest-run.ts`

### Implemented API routes (DB required at runtime)
- `POST /api/create-character` → `src/app/api/create-character/route.ts`
- `GET /api/quests?location=X` → `src/app/api/quests/route.ts` (dev-only: can mock-generate quests)
- `POST /api/action` → `src/app/api/action/route.ts` (solo quests only; party quests return `501`)
- `GET /api/dashboard?username=X` → `src/app/api/dashboard/route.ts`
- `GET /api/world-state` → `src/app/api/world-state/route.ts`
- `GET /api/leaderboard` → `src/app/api/leaderboard/route.ts`
- `GET /api/leaderboard/guilds` → `src/app/api/leaderboard/guilds/route.ts`
- `POST /api/webhook` → `src/app/api/webhook/route.ts`

### Stubbed endpoints (return `501 NOT_IMPLEMENTED`)
- `GET /api/agent/[username]` → `src/app/api/agent/[username]/route.ts`
- `POST /api/guild/create` → `src/app/api/guild/create/route.ts`
- `POST /api/guild/join` → `src/app/api/guild/join/route.ts`
- `POST /api/guild/leave` → `src/app/api/guild/leave/route.ts`
- `GET /api/guild/[guild_name]` → `src/app/api/guild/[guild_name]/route.ts`

### CLI dev harness
- Seed (DB required): `scripts/dev/seed.mjs` (`npm run dev:seed`)
- API smoke runner (server + DB required): `scripts/dev/smoke.mjs` (`npm run dev:smoke`)
- Offline deterministic smoke (no DB/server): `src/lib/sim/smoke.ts` (`npm run sim:smoke`)

## Repo progress / tracking rules

- Use `docs/CODEX_PROGRESS.md` as the “truth table” for tasks (done/next/blocked).
- Keep work in small verifiable chunks and **commit often**.

## Publishing + local run (when network works)

Remote:
- `origin` is set to `https://github.com/latitudegames/clawcraft.git`
- Push: `git push -u origin main`

Local run (DB-backed):
1. `docker compose up -d`
2. Copy `.env.example` → `.env.local`
3. `npm install`
4. `npx prisma migrate dev` (generates `prisma/migrations/*`)
5. `npm run dev:seed`
6. `npm run dev`
7. `npm run dev:smoke`

Offline sanity:
- `npm test`
- `npm run sim:smoke`

## What’s next (highest leverage)

1. **Unblock runtime setup**
   - Get networking working for Codex (so `npm install`, `gh`, `git push` work).
   - Generate + commit Prisma migrations (`prisma/migrations/*`).
2. **Finish core backend spec gaps**
   - Party quest queueing + 24h timeout (per `game-design.md`)
   - Equipment equip/unequip flow (inventory ↔ slots)
   - Implement stubbed guild + agent endpoints
3. **Only then** start frontend map work (Pixi spectator UI) per `visual-design.md`.

