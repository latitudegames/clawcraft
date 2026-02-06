# Spectator Load Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dev-only synthetic world-state mode + browser perf harness to validate Pixi map + HTML bubble overlay responsiveness with thousands of agents.

**Architecture:** Extend `GET /api/world-state` to optionally append synthetic agents (dev-only, query-param driven) using a pure helper in `src/lib/game/*` so it’s unit-testable and deterministic via seed. Update the spectator client to pass through synthetic query params from the page URL. Add a Playwright script to measure rAF frame times with a large synthetic population.

**Tech Stack:** Next.js App Router API routes, TypeScript, TanStack Query, PixiJS, Playwright, Node test runner (`node --test`).

---

### Task 1: Add Pure Synthetic World-State Helper

**Files:**
- Create: `src/lib/game/synthetic-world-state.ts`

**Step 1: Implement deterministic synthetic agent generation**
- Input: existing `WorldStateResponse`
- Output: new `WorldStateResponse` with additional agents
- Rules:
  - Must not mutate the input state (cache-safe)
  - Deterministic for a given seed
  - Options: `count`, `seed`, `statusRate`, `partyRate`, `only`
  - Clamp `count` to a safe maximum (avoid accidental OOM)

**Step 2: Add docstring explaining intended usage**
- Dev-only load testing
- Not part of V1 gameplay rules

---

### Task 2: Unit Tests For Synthetic Helper

**Files:**
- Create: `src/lib/game/synthetic-world-state.test.ts`
- Modify: `tsconfig.node-tests.json`

**Step 1: Write tests**
- Non-mutation: base `agents` length unchanged
- Count: appended agent count matches `count` (and respects `only`)
- Determinism: same seed produces identical first N synthetic agents
- Status: `statusRate=1` yields `status !== null` for synthetic agents

**Step 2: Run**
- `npm test`
- Expected: PASS

---

### Task 3: Wire Synthetic Mode Into `GET /api/world-state`

**Files:**
- Modify: `src/app/api/world-state/route.ts`

**Step 1: Parse query params**
- `synth_agents` (int)
- `synth_status` (float 0..1)
- `synth_party` (float 0..1)
- `synth_only` (bool)
- `synth_seed` (string)

**Step 2: Apply only in dev**
- Gate: `DEV_CONFIG.DEV_MODE`
- Keep existing TTL cache behavior for the base (real) world-state
- Append synthetic agents *without* mutating the cached base object

**Step 3: Smoke**
- With dev server running: `curl "http://localhost:3000/api/world-state?synth_agents=500"`
- Expected: JSON with `agents.length >= 500`

---

### Task 4: Pass Synthetic Params From URL Through The Spectator Client

**Files:**
- Modify: `src/lib/client/world-state.ts`
- Modify: `src/lib/client/hooks/useWorldState.ts`
- Modify: `src/components/spectator/SpectatorShell.tsx`

**Step 1: Make `getWorldState` accept an optional query object**
- Builds a query string and fetches `/api/world-state?...`

**Step 2: Update `useWorldState`**
- Accept optional query
- Include query in `queryKey` so caches don’t collide

**Step 3: Read synthetic query params in `SpectatorShell`**
- Parse from `useSearchParams()`
- Pass into `useWorldState({ ... })`

---

### Task 5: Add Browser Perf Harness For Render Responsiveness

**Files:**
- Create: `scripts/dev/perf-map-render.mjs`
- Modify: `package.json`

**Step 1: Add Playwright script**
- Opens: `/?synth_agents=2000&synth_status=0.15&synth_party=0.12&synth_seed=perf`
- Samples `requestAnimationFrame` deltas for ~3s
- Prints avg/p50/p95 frame times and rough FPS

**Step 2: Add npm script**
- `npm run dev:perf:map-render`

---

### Task 6: Update Roadmap/Tracker

**Files:**
- Modify: `docs/plans/2026-02-05-product-repo-improvement-tracker.md`
- Modify: `docs/plans/2026-02-05-spectator-parity-qa-checklist.md`
- Optional: `docs/CODEX_ROADMAP.md`

**Step 1: Add a “Perf Under Load” checklist item**
- Document new synthetic params and perf command(s)

**Step 2: Record a baseline run**
- Store results in a wave log (`docs/plans/YYYY-MM-DD-wave-XX-*.md`)

