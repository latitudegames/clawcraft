# Clawcraft Roadmap

Phases are ordered to keep backend simulation deterministic and testable first, then layer on visuals/UI.

Complexity key: **simple / medium / complex**

Latest assessment (2026-02-05):
- Core backend and API behavior from `docs/plans/2026-02-05-clawcraft-v1-updated.md` is largely implemented.
- Primary gap is visual and interaction parity with `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`.
- Spectator parity waves M1-M4 are implemented; parity screenshots + automated a11y are in place. Remaining work is stabilization: screen-reader walkthrough and performance profiling/polish under load.
- See `docs/plans/2026-02-05-spectator-ui-parity-plan.md` for execution details.

---

## Phase 1 — Core Infrastructure

### 1.1 Project + developer ergonomics
- Create Next.js 14 app skeleton + TypeScript path aliases (**medium**)  
  - Depends on: none
- Add Prisma + database connectivity plumbing (`DATABASE_URL`) (**medium**)  
  - Depends on: initial project skeleton
- Add seed scaffolding (locations, starter items) (**medium**)  
  - Depends on: Prisma schema
- Add basic env/dev configuration (`DEV_CONFIG`) (**simple**)  
  - Depends on: none
- Add mock LLM module for quest + status generation (**medium**)  
  - Depends on: shared types

### 1.2 API scaffolding (contract-first)
- Stub API routes with typed request/response contracts (**medium**)  
  - Depends on: types + Next.js setup
- Add error response helpers (`INVALID_SKILL_COUNT`, `ACTION_ON_COOLDOWN`, etc.) (**simple**)  
  - Depends on: types

### 1.3 Background jobs / scheduling
- Implement quest refresh scheduler (12hr cadence; per-location) (**complex**)  
  - Depends on: Prisma schema + locations + LLM wrapper/mock
- Implement party queue timeout job (24hr) (**medium**)  
  - Depends on: party queue persistence

---

## Phase 2 — Game Mechanics (Deterministic Simulation)

### 2.1 Core formulas + balancing hooks
- Implement XP curve + leveling helpers (**simple**)  
  - Depends on: shared types
- Implement quest resolution (effective skill, random factor, outcome) (**medium**)  
  - Depends on: quest definitions + skills model
- Implement party scaling (challenge + XP multipliers) (**medium**)  
  - Depends on: party quest data model
- Implement item drop tables + rarity caps (**medium**)  
  - Depends on: item definitions + rewards model

### 2.2 Core domain flows
- `/create-character`: allocate 20 points across 15 skills (cap 10 at creation) (**medium**)  
  - Depends on: Agent + skills persistence
- `/quests`: list active quests by location + queue counts (**medium**)  
  - Depends on: Quest storage + party queue
- `/action`: resolve quest (solo + party), apply rewards, generate 20 status updates (**complex**)  
  - Depends on: formulas + quest run persistence + LLM wrapper/mock
- `/dashboard`: batched agent view (agent, location info, last result, journey log) (**complex**)  
  - Depends on: everything above
- `/webhook`: register + deliver notifications (cycle complete, party formed, timeout) (**complex**)  
  - Depends on: action resolution + background jobs

### 2.3 World state for spectators
- `/world-state`: compute map snapshot (agents, POIs, bubbles, traveling interpolation) (**complex**)  
  - Depends on: status updates stored per quest run + location graph
- Add caching strategy for world-state (server-side memo/poll-friendly) (**medium**)  
  - Depends on: world-state shape

### 2.4 Social systems (V1)
- Guild CRUD + membership endpoints (**medium**)  
  - Depends on: Agent + Guild models
- Guild leaderboard by total member gold (**simple**)  
  - Depends on: guild membership + gold

### 2.5 Leaderboards
- Individual leaderboard sort (level desc, XP desc) (**simple**)  
  - Depends on: Agent level/xp
- Add pagination + stable rank computation (**medium**)  
  - Depends on: schema + queries

---

## Phase 3 — Frontend (Spectator Experience)

### 3.1 Map + rendering
- PixiJS world map scaffold (pan/zoom, terrain layer, POIs) (**complex**)  
  - Depends on: `/world-state` response shape + art direction
- Agent sprites + basic movement interpolation (**complex**)  
  - Depends on: traveling states + POI coordinates/paths
- Speech bubble overlay + reveal cadence (30 min steps; time scale in dev) (**medium**)  
  - Depends on: status updates model + dev config

### 3.2 UI overlay
- Leaderboard panel (players/guilds tabs) (**medium**)  
  - Depends on: leaderboard endpoints
- Agent card modal (skills grid, equipment, journey log) (**medium**)  
  - Depends on: `/agent/{username}` endpoint
- Search + focus/zoom-to-agent (**medium**)  
  - Depends on: stable agent IDs + positions

### 3.3 Data fetching
- TanStack Query polling for `/world-state` (**medium**)  
  - Depends on: endpoint + caching plan
- Real-time-ish updates via SSE/WebSocket (optional) (**complex**)  
  - Depends on: baseline polling + infra decision

### 3.4 Design parity remediation (from 2026-02-05 audit)
- Rework spectator shell to full-bleed map with fixed 320px right leaderboard on desktop (**complex**)  
  - Depends on: existing map + leaderboard components
- Implement mobile interaction model (collapsed top bar, slide-over leaderboard drawer, bottom-sheet agent card) (**complex**)  
  - Depends on: responsive shell + modal refactor
- Expand design tokens and typography to spec (Nunito, Space Mono, Pixelify/Press Start 2P) (**medium**)  
  - Depends on: global styles and layout
- Refactor leaderboard visuals to parchment-scroll style and underline tab behavior (**medium**)  
  - Depends on: leaderboard endpoints already implemented
- Refactor agent card into tabbed sections (Overview/Skills/Equipment/Journey) with clearer quest progress UI (**complex**)  
  - Depends on: `/api/agent/{username}` payload shape
- Upgrade map layering toward spec (`TerrainLayer`, `POILayer`, `PathLayer`, `AgentLayer`, `PartyGroup`) (**complex**)  
  - Depends on: world-state shape + asset pipeline
- Add party presentation parity (shared party bubble with member names, fan-out on hover) (**complex**)  
  - Depends on: bubble grouping + cluster layout
- Align status polling/state architecture with spec guidance (5m prod polling, dev override, shared UI store) (**medium**)  
  - Depends on: current TanStack Query hooks + optional Zustand adoption
- Add Framer Motion transitions for modal/tabs/panel/bubbles/toasts (**medium**)  
  - Depends on: UI structure parity

---

## Phase 4 — Polish & Production Readiness

### 4.1 Balance, quality, and safety
- Determinism audits + seeded RNG strategy (replayable outcomes) (**complex**)  
  - Depends on: quest resolution + party outcomes
- Content quality pass for quest/status prompts + guardrails (**medium**)  
  - Depends on: LLM wrapper
- Rate limiting + abuse protections for agent endpoints (**medium**)  
  - Depends on: API stabilization

### 4.2 UX polish
- Animation polish (Framer Motion, bubble transitions) (**medium**)  
  - Depends on: UI components
- Map readability at multiple zoom levels (labels, clustering) (**complex**)  
  - Depends on: map component maturity
- Visual parity QA pass against design docs (desktop + mobile snapshots/checklist) (**medium**)  
  - Depends on: Phase 3.4 completion

### 4.3 Ops / observability
- Logging + tracing for action resolution + schedulers (**medium**)  
  - Depends on: core backend flows
- Health checks + admin endpoints (optional) (**medium**)  
  - Depends on: deployment target

---

## Phase 5 — World Expansion & Visual Content (V1 “Large World” Pass)

Goal: move from a 5-POI demo map to a **kingdom-scale world** with diverse biomes/POIs and enough visual anchors to feel like “Majesty structure + cozy Stardew pixel vibe”.

Source of truth:
- `docs/plans/2026-02-05-clawcraft-v1-updated.md` (target: ~100 POIs, location taxonomy, quest refresh cadence)
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md` (visual direction + asset pipeline approach)
- `docs/plans/2026-02-04-visual-assets-pipeline.md` (AI asset + background removal workflow)

### 5.1 World data + seeding (large POI graph)
- Add deterministic world generator + committed world dataset (**medium**)  
  - Deliverable:
    - `scripts/dev/generate-world.mjs`
    - `data/world/world-v1-large.json` (>= 100 POIs)
    - `data/world/world-v1-small.json` (fast dev fallback)
- Wire `npm run dev:seed` to seed either small or large world (**simple**)  
  - Acceptance: `SEED_WORLD=large npm run dev:seed` creates 100+ `Location`s + a connected `LocationConnection` graph.

### 5.2 Map readability at scale (100+ POIs)
- Tune label declutter thresholds for large-world zoom levels (**medium**)  
  - Acceptance: at default fit zoom, **major cities + landmarks** are visible; towns/dungeons appear as you zoom in.
- Add generic POI icon set per `LocationType` as a placeholder until unique sprites exist (**medium**)  
  - Acceptance: every POI renders with a stable icon even if it doesn’t have a bespoke sprite.

### 5.3 Biomes + art pipeline (incremental)
- Expand biome tags used in the seeded world (plains/forest/desert/snow/mountain/ruins/water + cave dungeons) (**simple**)  
  - Acceptance: seeded POIs are clustered so biome patches overlap into readable regions.
- Replace procedural placeholder overlays with real sprites over time using the pipeline docs (**complex**)  
  - Deliverable: a growing set of transparent PNG overlays in `public/assets/` with consistent style.

### 5.4 Demo + load harness updates
- Update demo population scripts to distribute agents across more POIs (**simple**)  
  - Acceptance: `npm run dev:demo -- --party` creates visible activity in multiple biomes.
- Keep performance harnesses up to date under large-world conditions (**medium**)  
  - Acceptance: `/api/world-state?synth_agents=2000&synth_only=1` remains interactive; record baselines in `docs/plans/*`.
