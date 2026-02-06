# Codex Work Progress (Source of Truth)

Last updated: **2026-02-06**

This is the **living status + work log** for changes I make in this repo.

## Plan docs (high-level source of truth)
I must reference these for the authoritative plan/spec:
- `ROADMAP.md` — phased roadmap
- `game-design.md` — mechanics + API shapes/behavior
- `visual-design.md` — UI/art direction + component plan
- `docs/plans/2026-02-04-visual-assets-pipeline.md` — AI asset generation + background removal pipeline
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md` — design target for spectator UX/UI
- `docs/plans/2026-02-05-clawcraft-v1-updated.md` — V1 gameplay/API target
- `docs/plans/2026-02-05-spectator-ui-parity-plan.md` — concrete gap assessment and implementation waves
- `docs/plans/2026-02-05-product-repo-improvement-tracker.md` — active milestone tracker across workstreams
- `docs/plans/2026-02-05-wave-1-implementation-log.md` — implementation log + validation checklist for current wave
- `docs/plans/2026-02-05-wave-2-qa-a11y-performance-log.md` — implementation log for QA/a11y/perf hardening
- `docs/plans/2026-02-06-wave-3-map-declutter-log.md` — implementation log for map declutter/readability work
- `docs/plans/2026-02-06-wave-4-terrain-richness-log.md` — implementation log for procedural terrain richness
- `docs/plans/2026-02-06-wave-5-bubble-declutter-log.md` — implementation log for bubble declutter at hotspots
- `docs/plans/2026-02-05-spectator-parity-qa-checklist.md` — parity QA checklist (automated + manual pass tracking)

Execution-level translation of those docs:
- `docs/CODEX_ROADMAP.md` — repo map + build order + dev-harness plan

---

## Snapshot: repo state right now

### Implemented
- Next.js app skeleton (`src/app/*`)
- Tailwind theme tokens (`tailwind.config.ts`, `src/app/globals.css`)
- Domain + API types (`src/types/*`)
- Deterministic RNG + formulas + mock quest/status generators (`src/lib/**`)
- Mock quest generation guarantees at least one solo quest per location (dev-mode).
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
  - `npm run dev:llm` (OpenRouter smoke; requires `OPENROUTER_API_KEY`)
  - `npm run dev:llm:status` (OpenRouter status generator; requires `OPENROUTER_API_KEY`)
  - `npm run dev:llm:quest` (OpenRouter quest generator; requires `OPENROUTER_API_KEY`)
  - `npm run dev:demo` (creates demo agents + starts quests so the spectator map has activity)
  - Offline deterministic smoke (no DB/server): `npm run sim:smoke`
- CI: GitHub Actions runs lint/typecheck/tests/build (`.github/workflows/ci.yml`)
- Core API loop (requires DB + migrations at runtime):
  - `POST /api/create-character`
  - `GET /api/quests`
  - `POST /api/action` (solo + party queueing; party queues reset after forming so party quests stay joinable; supports equipment changes)
  - `GET /api/dashboard`
  - `GET /api/world-state`
  - `GET /api/leaderboard` (supports `limit` + `offset`)
  - `GET /api/leaderboard/guilds` (supports `limit` + `offset`)
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
  - `/api/world-state` has a small server-side TTL cache (1s) with in-flight dedupe to reduce DB load under polling
  - Map terrain: subtle grass texture background (CSS)
  - Speech bubble overlay anchored to agent markers (HTML overlay)
  - Bubble overlap mitigation (deterministic stacking + viewport clamping)
  - Party bubble dedupe: party quest runs render **one bubble per run** (label includes `+N`; focus pins the bubble to the focused party member)
  - Party/overlap readability: overlapping agents are offset into a small deterministic cluster (sprites + click targets + bubbles)
  - Zoom-based declutter (hide labels + reduce bubbles when zoomed out)
  - Pixi text labels remain screen-sized while zooming (inverse-scale); agent name labels are focused-only
  - Agent sprites rendered on-map (starter set in `public/assets/agents/*`)
  - POI icons rendered on-map (starter set in `public/assets/poi/*`)
  - Location connection lines rendered (via `connections` in `/api/world-state`)
  - Connection roads: connections render as bent dirt paths (deterministic per edge)
  - Map zoom controls (+/−/reset) + center-on-selected-agent button
  - Leaderboard panel (players/guilds tabs) wired to `/api/leaderboard*`
  - Click player row → focus map on agent + open agent modal (`GET /api/agent/[username]`)
  - Click agent marker on map → open agent modal
- V1 behavior alignment already present:
  - Leaderboard sort is level desc then XP desc
  - Dashboard endpoint is batched and returns broad agent state
  - Quest runs generate and reveal 20 statuses over 30-minute steps (time-scaled in dev mode)
  - Guilds are social/cosmetic-only in V1 behavior
  - Journey log is stored/served as programmatic entries

### Webhooks + background scheduling
- Webhook registration: `POST /api/webhook`
- Webhook delivery implemented:
  - `cycle_complete` sent when a quest run resolves (triggered via `resolveQuestRun`)
  - `party_formed` sent when a party quest fills and starts
  - `party_timeout` sent when a queued party expires (opportunistic + background job)
- Background jobs runner (`src/lib/server/jobs/run-jobs.ts`) currently performs:
  - resolve due quest runs (sends `cycle_complete` webhooks)
  - time out expired party queues (sends `party_timeout` webhooks)
  - refresh quests every 12h (deterministic; idempotent per cycle)
- Production cron wiring:
  - `vercel.json` schedules `GET /api/jobs/run` every 10 minutes
  - Protect the endpoint by setting `CRON_SECRET` or `JOB_SECRET` (expects `Authorization: Bearer <secret>`)

### Remaining parity and polish work
- Parity QA is not complete yet:
  - Desktop and mobile walkthrough checklist still needs to be run against the 2026-02-05 design docs.
- Accessibility pass is pending:
  - Keyboard/focus behavior and contrast validation across spectator shell, drawer, modal, and toasts.
- Map polish opportunities remain:
  - Optional ambient map effects (particles/day-night palette shift) are deferred.
- Visual parity observations from screenshot pass:
  - Dense world clusters still produce heavy bubble overlap/noise in some zones.
  - Map terrain readability and POI emphasis remain lighter than spec intent.
  - Typography/spacing polish can be tightened in leaderboard and modal sections.
- (Optional) Production ops polish (health checks, tracing)

---

## Blockers / constraints (current environment)

- Networking is working (able to `npm install` and `git push`).
- Local Postgres works via Docker (`docker compose up -d`). If `docker compose` is missing (common when `docker` is installed via Homebrew), install the plugin (`brew install docker-compose`) and add `cliPluginsExtraDirs` to `~/.docker/config.json` as per the Homebrew caveats.
- `npm audit` is clean (0 vulnerabilities) after upgrading to Next 16 + ESLint 9.

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
2. Configure env: copy `.env.example` → `.env` (and optionally `.env.local`)
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

### Now (active focus: spectator design parity)
- [x] Implement typography + token foundation (Nunito, Space Mono, Pixelify/Press Start 2P; expanded CSS vars/utilities).
- [x] Refactor spectator shell to full-bleed map with fixed right leaderboard panel on desktop.
- [x] Implement mobile UX model (collapsed header, leaderboard drawer, bottom-sheet agent card).
- [x] Refactor agent card into tabbed sections with cleaner hierarchy and quest progress emphasis.
- [x] Rework leaderboard tabs/rows to parchment spec (text tabs + active underline + row hover polish).
- [x] Add Framer Motion transitions for modal open/close, tab changes, and panel transitions.
- [x] Adjust world-state polling defaults for production-like cadence, keep a fast dev override.
- [x] Improve map layer separation, party bubble member summaries, and POI tooltip behavior.
- [x] Add toast layer scaffold + shared spectator UI store (Zustand).

### Next (after parity baseline lands)
- [x] Run a visual parity QA pass against the 2026-02-05 design docs (desktop + mobile screenshots).
- [x] Complete automated accessibility checks (focus traps, keyboard behavior, contrast checks via axe-core).
- [x] Add automated screen-reader semantics smoke (role-based checks via Playwright).
- [ ] Manual screen-reader navigation walkthrough (VoiceOver/NVDA).
- [ ] Tune map performance and network cadence under demo population load.
- [ ] Consider optional ambient map effects (post-parity polish).

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

### 2026-02-06
- Map declutter pass:
  - Pixi text labels are inverse-scaled so POI names don't pixelate/grow while zooming
  - Added procedural biome tile textures + Pixi base terrain tiling sprite; biome patches are now tiled (masked) instead of flat alpha circles
  - POI labels use the pixel font family (per design spec)
  - Agent name labels are focused-only (speech bubbles already include names)
  - Bubble declutter: when zoomed out, solo bubbles group by nearest POI and selection prefers bubbles near viewport center
  - POI label declutter: show/hide by POI type + zoom; always show hovered/pinned POI label
  - Lightweight biome decoration overlays (procedural sprites) to reduce flatness around POIs
  - Smooth wheel zoom tween (~300ms ease-out) while keeping the cursor’s world point pinned; cancels on drag/pinch and HUD interactions
  - Light pan inertia on drag release (momentum + decay); cancels on new gestures and wheel zoom
  - Updated parity screenshots (`npm run dev:parity:screenshots`)
  - Map zoom controls (+/−/reset) and a manual Center button
  - Leaderboard highlights the selected player; Enter selects the top search result
  - Click agent markers on the map to open the same agent modal
  - Deep-link selected agent via URL: `/?agent=<username>` (selection persists on refresh)
  - Agent modal shows a small sprite avatar (deterministic by username)
  - Agent modal shows current quest progress (Step X/20) when questing
  - Screen-reader smoke (`npm run dev:sr`) improved to wait for rows before attempting modal/sheet checks
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
- Added a small async TTL cache helper + wired it into `/api/world-state` to dedupe frequent polls.
- Added bubble grouping helper so party quest runs show one shared bubble (focus-aware).
- Expanded the API smoke script with an optional guild flow (`SMOKE_GUILD=1` / `--guild`).
- Rendered connection roads as bent dirt paths (deterministic per edge) and added unit tests for the road polyline helper.
- Fixed map centering math by introducing a shared `computeCenterTransform` helper (also ensures the manual Center button respects clustered offsets).
- Added a spectator empty-state hint that points to `npm run dev:demo` for quickly populating the map.
- Added `README.md` quickstart + a subtle grass texture behind the Pixi map canvas.
- Added `offset` pagination support to `/api/leaderboard*` (stable ranks from offset).
- Chore: upgraded to Next.js `16.1.6` + migrated linting to ESLint 9 flat config (`eslint.config.js`); `npm audit` is now clean.
- Added optional OpenRouter client + `npm run dev:llm` smoke script (DeepSeek v3.2 default) for narrative/content experiments.
- Added OpenRouter status generator (`npm run dev:llm:status`) + validator tests (dev-only, no CI network calls).
- Added OpenRouter quest generator (`npm run dev:llm:quest`) + validator tests (dev-only, no CI network calls).
- Fixed mock status generation to end at the destination on step 20 (`traveling=false`), matching `game-design.md`.
- Made quest refresh scheduler production-ready with an idempotent per-cycle DB guard (`QuestRefreshCycle`).
- Added 3 more starter agent sprites (`public/assets/agents/*`) and expanded `AGENT_SPRITE_KEYS` for more visual variety on the map.
- Extended `GET /api/agent/[username]` to include `current_quest` and render it in the agent modal.
- Performed a code-level UX/UI parity audit against:
  - `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`
  - `docs/plans/2026-02-05-clawcraft-v1-updated.md`
- Updated roadmap docs for parity execution:
  - `ROADMAP.md` (added Phase 3.4 Design Parity Remediation)
  - `docs/CODEX_ROADMAP.md` (added parity-focused Step D execution order)
  - Added `docs/plans/2026-02-05-spectator-ui-parity-plan.md` (gap matrix + implementation waves)
- Added tracking docs to drive execution from new source-of-truth specs:
  - `docs/plans/2026-02-05-product-repo-improvement-tracker.md`
  - `docs/plans/2026-02-05-wave-1-implementation-log.md`
- Started parity implementation wave (foundation + shell):
  - Loaded and wired design fonts in app layout.
  - Expanded global design tokens and Tailwind font aliases.
  - Refactored spectator shell to full-bleed map + fixed desktop panel + mobile drawer.
  - Refactored agent modal into tabbed sections with mobile bottom-sheet behavior.
  - Upgraded leaderboard tab treatment toward spec style.
  - Updated world-state polling cadence to dev-fast / prod-conservative defaults.
  - Verified with `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`.
- Continued parity implementation (map/motion/state):
  - `WorldMap` layer separation now explicit (`terrainGraphics`, `pathGraphics`, `markerGraphics`) with richer path/terrain styling.
  - Party bubbles include member-aware summary text (`with Alice, Bob +3 others`).
  - POI hover/tap tooltip interactions were added.
  - Party hover fan-out now expands grouped runs on hover using deterministic offsets.
  - Added shared spectator UI Zustand store (`src/lib/client/state/spectator-ui-store.ts`) for drawer state + toast queue.
  - Added toast layer scaffold (`src/components/spectator/ToastLayer.tsx`) and wired world-state error notifications.
  - Added Framer Motion transitions for tab indicators/content and bubble/tooltip reveals.
  - Added initial accessibility hardening (keyboard-selectable leaderboard rows, modal focus trap/restore, mobile drawer escape handling).
  - Added mobile leaderboard drawer focus trap and focus restoration.
  - Updated parity tracking docs (`product-repo-improvement-tracker`, `wave-1-implementation-log`) to reflect M2/M3 complete and M4 items implemented.
- Added deterministic party fan-out helper + tests:
  - `src/lib/ui/party-fanout.ts`
  - `src/lib/ui/party-fanout.test.ts`
- Updated world-map pointer behavior:
  - POI hover now responds during pointer movement without requiring drag.
  - Hovering a party member fans out that party cluster for readability.
- Added stronger map declutter controls:
  - Bubble limits tightened by zoom while preserving minimum visibility.
  - Agent labels are now budgeted by zoom/focus instead of rendering all labels.
- Added `docs/plans/2026-02-05-spectator-parity-qa-checklist.md` to track parity QA completion and remaining manual checks.
- Fixed a Pixi init ordering issue so the map camera transform stays in sync with HTML overlays on initial load (`WorldMap` uses a `sceneVersion` signal once `app.init()` completes).
- Updated seeded POI coordinates to improve default camera framing and keep parity screenshot runs consistently readable.
- Added mobile map touch gestures (single-finger pan, pinch-to-zoom) and disabled browser touch scrolling on the map container (`touch-action: none` via Tailwind `touch-none`).
- Added an accessibility smoke audit (`npm run dev:a11y`) using axe-core + Playwright; fixed contrast issues by introducing `ink.muted` tokens so small text passes WCAG AA on parchment.
