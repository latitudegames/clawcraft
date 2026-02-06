# Product & Repo Improvement Tracker

Date: 2026-02-05

## Source Of Truth Order

1. `docs/plans/2026-02-05-clawcraft-v1-updated.md` (gameplay/API behavior)
2. `docs/plans/2026-02-05-clawcraft-design-technical-specification.md` (UX/UI/visual system)
3. `game-design.md` and `visual-design.md` (legacy/extended detail)
4. `ROADMAP.md` and `docs/CODEX_ROADMAP.md` (execution sequencing)

If conflicts appear, update this tracker with the decision and link the doc change.

## Program Goals

- Reach V1 behavior parity across API, simulation, and spectator outputs.
- Reach design parity for desktop and mobile spectator UX/UI.
- Keep deterministic simulation and testability intact while improving UX.

## Workstreams

| ID | Workstream | Owner | Status | Success Metric |
|----|------------|-------|--------|----------------|
| WS-01 | Spectator UX/UI parity | Codex | In progress | Desktop/mobile match design spec checklist |
| WS-02 | API contract parity hardening | Codex | Planned | Response shapes and errors align to V1 doc examples |
| WS-03 | Map readability + party visualization | Codex | In progress | Party and bubble readability at multiple zoom levels |
| WS-04 | Motion and interaction polish | Codex | In progress | Modal/panel/tab transitions match spec timing |
| WS-05 | Verification and regression guardrails | Codex | In progress | Lint/typecheck/tests + smoke remain green |

## Milestone Board

### M1: Foundation + Shell (Active)
- [x] Typography system wired (Nunito, Space Mono, Pixelify/Press Start 2P)
- [x] Expanded design tokens implemented globally
- [x] Desktop full-bleed map + fixed right panel layout
- [x] Mobile shell primitives (top bar + leaderboard drawer)
- [x] Agent card mobile bottom-sheet behavior

### M2: Component Parity
- [x] Leaderboard tabs/rows match parchment specification
- [x] Agent card converted to tabbed IA (Overview/Skills/Equipment/Journey)
- [x] Guild tag treatment normalized across map/list/modal

### M3: Map + Party Parity
- [x] Terrain/path/POI/agent layer responsibilities cleaned up
- [x] Party bubble content includes member names with truncation rules
- [x] POI tooltip interactions implemented (hover/tap)
- [x] Party hover fan-out behavior implemented for grouped runs
- [x] Mobile touch gestures implemented (single-finger pan, pinch-to-zoom)
- [x] Fix Pixi init race so camera transforms apply to the Pixi scene (prevents HTML overlays drifting from the map)
- [x] Update seeded POI coordinates to improve default camera framing and reduce early-stage clutter in parity walkthroughs
- [x] Keep Pixi text labels screen-sized (inverse-scale) and reduce agent name label clutter (focused-only)
- [x] Add procedural biome tile textures + Pixi terrain tiling background to reduce “empty grass” feel
- [x] Reduce bubble noise when zoomed out by grouping solo bubbles by nearest POI and selecting bubbles near the viewport center
- [x] Declutter POI labels by type + zoom; always show hovered/pinned POI label
- [x] Add lightweight biome decoration overlays around POIs (procedural textures as a stand-in for the asset overlay pipeline)
- [x] Smooth wheel zoom tween (~300ms ease-out) while keeping the cursor’s world point pinned (matches spec “Map Zoom” feel)
- [x] Add light pan inertia on drag release (momentum + decay) to match the spec’s “Pan inertia” guidance

### M4: Motion + Timing Parity
- [x] Framer Motion transitions for modal/tabs/panel/bubbles
- [x] Toast layer scaffold added
- [x] World-state polling profile split into prod-safe + dev-fast defaults
- [x] Optional Zustand store added for shared spectator UI state

### M5: Parity QA and Stabilization
- [x] Automated verification suite (lint/typecheck/build/test) green
- [x] Automated a11y smoke (axe-core via Playwright) green (`npm run dev:a11y`)
- [x] Desktop parity screenshot walkthrough captured
- [x] Mobile parity screenshot walkthrough captured
- [x] Accessibility contrast pass (axe-core across baseline + drawer + modal; see `docs/plans/2026-02-05-spectator-parity-qa-checklist.md`)
- [x] Screen-reader semantics smoke (role-based checks; `npm run dev:sr`)
- [ ] Screen-reader navigation walkthrough
- [x] Added a manual SR walkthrough checklist doc (`docs/plans/2026-02-06-screen-reader-navigation-walkthrough.md`)
- [ ] Performance pass for map responsiveness and network cadence
- [x] World-state perf harness added and baseline recorded (`npm run dev:perf:world-state`)

## Decision Log

| Date | Decision | Why | Follow-up |
|------|----------|-----|-----------|
| 2026-02-05 | Prioritize UX/UI parity before new feature surface area | Biggest mismatch is visual/interaction quality, not missing core mechanics | Complete M1+M2 before broadening scope |
| 2026-02-05 | Keep imperative Pixi for current parity wave, defer `@pixi/react` migration decision | Reduces scope while still allowing visual and interaction progress | Re-evaluate in M3 once layer boundaries are cleaner |
| 2026-02-05 | Add lightweight shared Zustand store for spectator-only UI state (`mobileLeaderboardOpen`, toasts) | Keeps cross-component UI coordination simple without coupling to server state | Expand only if parity QA finds additional shared-state pain |
