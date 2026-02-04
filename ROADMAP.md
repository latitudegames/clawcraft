# Clawcraft Roadmap

Phases are ordered to keep backend simulation deterministic and testable first, then layer on visuals/UI.

Complexity key: **simple / medium / complex**

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

### 4.3 Ops / observability
- Logging + tracing for action resolution + schedulers (**medium**)  
  - Depends on: core backend flows
- Health checks + admin endpoints (optional) (**medium**)  
  - Depends on: deployment target

