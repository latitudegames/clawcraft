# Codex Execution Roadmap (Engineering, CLI-first)

Last updated: **2026-02-05**

This document is **Codex’s execution-level roadmap** for working in this repo: file structure, build order, and a **CLI-only** dev/testing harness that lets me validate APIs and game logic locally.

**High-level product plans live elsewhere and are the source of truth**:
- `ROADMAP.md` — phased build plan (infrastructure → mechanics → frontend → polish)
- `game-design.md` — mechanics + API contracts/spec
- `visual-design.md` — UI/art direction + component architecture
- `docs/plans/2026-02-04-visual-assets-pipeline.md` — visual asset generation pipeline (AI → background removal)

If this roadmap conflicts with those plan docs, the plan docs win (or should be updated first).

---

## 0) Project invariants (don’t break these)

From `game-design.md`:
- **Deterministic simulation:** once an agent submits choices, resolution is deterministic (seeded RNG). No “surprise” nondeterminism.
- **No LLM at action-time (production intent):** quest/status content should be pre-generated, then stored. (Dev mode uses deterministic mocks.)
- **20 status updates are generated up front** on quest selection; the map reveals them over time (time-scaled in dev).

From `ROADMAP.md`:
- **Backend determinism + contracts first**, then visuals/UI later.

---

## 1) Repo map (where things live)

Top-level:
- `ROADMAP.md`, `game-design.md`, `visual-design.md` — authoritative product plan/specs
- `docs/CODEX_ROADMAP.md` — this doc (execution order + repo map)
- `docs/CODEX_PROGRESS.md` — living progress log (source of truth for “what’s done/next/blocked”)
- `docs/plans/*` — smaller plan docs (e.g., visual asset pipeline)

Backend + tooling:
- `prisma/schema.prisma` — DB schema (Postgres); migrations are committed (`prisma/migrations/*`)
- `scripts/dev/seed.mjs` — idempotent seed (locations/connections/items)
- `scripts/dev/smoke.mjs` — API smoke runner (calls local server endpoints)
- `scripts/dev/jobs.mjs` — background jobs runner (calls `POST /api/jobs/run`)
- `docker-compose.yml` — local Postgres container (optional but recommended)

App code:
- `src/app/api/*/route.ts` — Next.js App Router API handlers
- `src/lib/game/*` — deterministic formulas + quest resolution + reward effects
- `src/lib/ai/mock-llm.ts` — deterministic quest/status generators for dev mode
- `src/lib/db/prisma.ts` — Prisma singleton
- `src/lib/server/*` — server-only helpers used by routes
- `src/lib/sim/smoke.ts` — offline simulation harness (no DB / no Next server)
- `src/types/*` — shared domain + API contract types
- `src/config/dev-mode.ts` — dev-mode flags (`DEV_TIME_SCALE`, `DEV_MOCK_LLM`, etc.)

---

## 2) Current repo shape (what exists today)

### Runtime stack
- Next.js App Router (`src/app/*`)
- Prisma + Postgres (`prisma/schema.prisma`)
- Tailwind styling (`tailwind.config.ts`, `src/app/globals.css`)

### Game/sim building blocks (deterministic)
- `src/lib/utils/rng.ts` — seeded RNG helper (Mulberry32 via FNV-1a hash)
- `src/lib/game/formulas.ts` — XP curve, effective skill, outcome thresholds
- `src/lib/game/formulas.test.ts` — spec-check tests for formulas (Node test runner style)
- `src/lib/ai/mock-llm.ts` — deterministic quest/status generators for dev-mode

### Contracts / shared types (contract-first direction)
- `src/types/*.ts` — domain types (`skills`, `quests`, `items`, `agents`) + API shapes (`api.ts`)

### API surface (currently stubbed)
Implemented routes:
- `POST /api/create-character` — `src/app/api/create-character/route.ts`
- `GET /api/quests?location=X` — `src/app/api/quests/route.ts` (dev-only mock quest generation)
- `POST /api/action` — `src/app/api/action/route.ts` (solo + party queueing; equipment changes)
- `GET /api/dashboard?username=X` — `src/app/api/dashboard/route.ts`
- `GET /api/world-state` — `src/app/api/world-state/route.ts`
- `GET /api/leaderboard` — `src/app/api/leaderboard/route.ts`
- `GET /api/leaderboard/guilds` — `src/app/api/leaderboard/guilds/route.ts`
- `POST /api/webhook` — `src/app/api/webhook/route.ts`
- `GET|POST /api/jobs/run` — `src/app/api/jobs/run/route.ts` (runs schedulers + timeouts; protect with `CRON_SECRET` or `JOB_SECRET` when deployed)

Social endpoints (implemented):
- `GET /api/agent/[username]`
- `POST /api/guild/create`
- `POST /api/guild/join`
- `POST /api/guild/leave`
- `GET /api/guild/[guild_name]`

### Dev-mode config (present and used)
- `src/config/dev-mode.ts` exposes `DEV_CONFIG` flags (time scale, mock LLM, seeding, verbosity).
  - `DEV_TIME_SCALE` is used to speed up quest cooldown/status cadence in API calculations.

---

## 3) Order of operations (how to build this repo safely)

This mirrors the intent of `ROADMAP.md` (backend determinism first), but translates it into **repo-local execution steps**.

### Step A — Developer ergonomics + deterministic baseline
Goal: I can run repeatable simulations and validate behavior without UI.

1. Wire a DB client module (Prisma singleton)
   - Create `src/lib/db/prisma.ts` (singleton pattern for Next.js dev reloads)
2. Establish “determinism keys” (seed strategy)
   - Standardize seeds for:
     - quest generation runs (by `locationId + cycleTime`)
     - action resolution (by `questId + agentId + cycleTime`)
     - status generation (by `questRunId + step`)
3. Add a seed pipeline (locations/items + optional demo agents)
   - Implement a minimal seed that creates:
     - a handful of `Location`s + `LocationConnection`s
     - a small catalog of `Item`s
     - optional demo `Agent`s

Deliverable: local DB with stable sample world + the same request produces the same result.

### Step B — Implement core API routes (contract-first)
Goal: Agents can fully “play” via API using shapes from `src/types/api.ts`.

Implement in this order (reduces dependency fan-out):
1. `POST /api/create-character`
   - Validates: exactly 20 points, cap 10 at creation, only known skills
   - Creates `Agent` with JSON `skills`, default location, empty inventory/equipment
2. `GET /api/quests?location=X`
   - Reads active quests originating at location
   - Includes queue counts for party quests (`QuestPartyQueueParticipant`)
   - In dev mode, can auto-generate quests via `mockGenerateQuest` if none exist
3. `POST /api/action`
   - Validates cooldowns (`nextActionAvailableAt`)
   - Handles *optionally*:
     - quest selection + run creation (`QuestRun`, `QuestRunParticipant`)
     - party quest queueing/formation (`QuestPartyQueue`, `QuestPartyQueueParticipant`)
     - equipment changes (inventory ↔ equipment)
     - skill point allocation
   - Computes deterministic outcome:
     - effective skill (from `src/lib/game/formulas.ts`)
     - random factor (seeded)
     - success level + outcome thresholds
   - Creates 20 status updates (mock LLM in dev)
4. `GET /api/dashboard?username=X`
   - Returns `DashboardResponse` from `src/types/api.ts`
   - Pulls:
     - agent profile + computed `xp_to_next_level`
     - current quest run (if active) + statuses + current step (time-scaled in dev)
     - last quest result (persisted JSON blob or joined tables)
     - location info (nearest POIs can be a placeholder initially)
5. `GET /api/world-state`
   - Provides spectator snapshot:
     - locations/POIs (with coordinates once present)
     - active agents + “traveling interpolation” targets
     - current speech/status bubble text
6. `GET /api/leaderboard`
   - Sort by level desc, XP desc (per `game-design.md`)
7. `POST /api/webhook`
   - Stores `Agent.webhookUrl`
   - (Later) delivery of cycle_complete / party_formed / party_timeout events

Deliverable: a complete agent gameplay loop purely via HTTP calls.

### Step C — Background jobs / scheduling
Goal: the world evolves and parties resolve without manual triggers.

1. Quest refresh scheduler (12hr; dev-only mock for now)
2. Party queue timeout job (24hr; implemented via `GET|POST /api/jobs/run`)
3. Quest run resolution sweep (sends `cycle_complete` webhooks)
4. Webhook delivery for:
   - quest resolution (cycle complete)
   - party formed
   - party timed out

Note: `ROADMAP.md` calls these out as “complex”. This repo includes `vercel.json` Cron wiring; you still need to set `CRON_SECRET`/`JOB_SECRET` in your deploy env.

### Step D — Frontend spectator experience
Goal: the map renders world state and updates over time.

1. World map scaffold (PixiJS v8; imperative wrapper in client component)
2. Polling `/api/world-state` (TanStack Query)
3. Speech bubbles + interpolation (time-scaled in dev)
4. Leaderboard + agent cards

Visual assets for POIs/agents/terrain:
- Use `docs/plans/2026-02-04-visual-assets-pipeline.md` as the source of truth.
- It’s acceptable to add an icon library (e.g. `lucide-react`) if UI needs it.

Deliverable: humans can watch the world without interacting.

---

## 4) Dev mode + self-testing harness (so I can verify changes)

### Goals
- Single-command local run that includes DB + seed + server
- Deterministic API “smoke tests” I can run repeatedly
- Dev-only helpers are gated from production

### Existing knobs
`src/config/dev-mode.ts`:
- `DEV_TIME_SCALE` (default `360`) — intended to compress time for faster map/status progression
- `DEV_MOCK_LLM` — default on (mock quest/status generation)
- `DEV_SEED` — default on (seed on start)
- `DEV_VERBOSE` — optional logging

### Present (already in repo)
1. `.env.example` — local `DATABASE_URL` + dev flags (`DEV_TIME_SCALE`, `DEV_MOCK_LLM`, etc.)
2. `docker-compose.yml` — optional local Postgres for consistent onboarding
3. Dev “smoke runner”
   - `scripts/dev/smoke.mjs` (via `npm run dev:smoke`) to:
     1) create a character
     2) fetch quests
     3) take an action
     4) fetch dashboard + world-state
   - runs against `http://localhost:3000` and prints concise pass/fail + payload snippets
   - Optional flags:
     - `--party` (or `SMOKE_PARTY=1`) exercises party queueing/formation
     - `--guild` (or `SMOKE_GUILD=1`) exercises guild create/join/leave + guild leaderboard
4. Dev “demo populater”
   - `scripts/dev/demo.mjs` (via `npm run dev:demo -- --party`) creates demo agents and starts quests so the spectator map has activity immediately
5. Dev seed script
   - `scripts/dev/seed.mjs` (via `npm run dev:seed`) to upsert:
     - locations + connections
     - starter items
6. Offline sim (no DB / no server)
   - `src/lib/sim/smoke.ts` (via `npm run sim:smoke`) prints a deterministic JSON payload for fast iteration

### Note: CLI-only (intentionally)
Per current direction, dev mode stays **CLI-only** (no `/dev` UI page) so it’s usable in constrained environments.

### Guardrails
- Any dev-only routes must hard-fail in production.
- Seeding/reset must be explicit (avoid accidental prod wipes).

---

## 5) “Source of truth” for ongoing work progress

Use `docs/CODEX_PROGRESS.md` as the living work log + status tracker.

Rules for myself:
1. Reference `ROADMAP.md`, `game-design.md`, and `visual-design.md` for the high-level plan/spec.
2. Track *implementation reality* (what’s done, what’s next, what’s blocked) in `docs/CODEX_PROGRESS.md`.
3. Keep tasks small and verifiable (each should have a command or API call that proves it works).
