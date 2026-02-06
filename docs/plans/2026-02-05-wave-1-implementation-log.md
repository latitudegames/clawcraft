# Wave 1 Implementation Log (Foundation + Shell)

Date: 2026-02-05
Parent tracker: `docs/plans/2026-02-05-product-repo-improvement-tracker.md`

## Scope

This wave implements the first parity slice:
- typography + token foundation
- spectator shell layout parity
- responsive shell primitives (mobile header + leaderboard drawer)
- agent modal baseline bottom-sheet behavior on mobile
- world-state polling defaults aligned for production safety

## Task Checklist

- [x] Add font loading in app layout (Nunito, Space Mono, Pixelify/Press Start 2P)
- [x] Expand global CSS tokens for terrain and UI accents
- [x] Add Tailwind font family aliases for headings/body/rank labels
- [x] Refactor `SpectatorShell` to full-bleed map composition
- [x] Add mobile leaderboard drawer toggling
- [x] Update `WorldMap` to fill parent height (not fixed height)
- [x] Refactor `AgentModal` to support mobile bottom-sheet style
- [x] Change world-state polling to env-aware defaults (prod conservative, dev fast)
- [x] Run lint and typecheck

## Validation Checklist

- [ ] Desktop: map occupies viewport with right-side fixed panel
- [ ] Mobile: leaderboard opens as drawer and can close via overlay/button
- [ ] Mobile: agent modal appears as bottom-sheet style container
- [ ] Fonts render as expected (body/headings/rank numerals)
- [ ] No regression in selecting agents from map or leaderboard
- [x] Lint + typecheck pass
- [x] Build pass (`npm run build`)
- [x] Node test suite pass (`npm test`)

## Notes

- If any visual compromise is made for implementation speed, document it in this file and promote it to M2.
- Implemented files:
  - `src/app/layout.tsx`
  - `src/app/globals.css`
  - `tailwind.config.ts`
  - `src/components/spectator/SpectatorShell.tsx`
  - `src/components/spectator/WorldMap.tsx`
  - `src/components/spectator/LeaderboardPanel.tsx`
  - `src/components/spectator/AgentModal.tsx`
  - `src/lib/client/hooks/useWorldState.ts`
- Additional parity-forward work started in map layer:
  - `WorldMap` now separates terrain/path/marker drawing layers within Pixi scene setup.
  - Party bubbles now include member summary text (e.g. `with Alice, Bob +3 others`).
  - POI tooltip interaction added for hover/tap.
  - Party hover fan-out added for grouped quest runs.

## Follow-on implementation (Wave 2-4 progress)

- Added shared spectator UI state store with Zustand:
  - `src/lib/client/state/spectator-ui-store.ts`
  - tracks mobile leaderboard drawer state and toast queue
- Added toast/alert layer scaffold:
  - `src/components/spectator/ToastLayer.tsx`
  - animated enter/exit and auto-dismiss handling
- Added motion parity refinements:
  - Animated active tab indicator in leaderboard and agent modal
  - Animated tab content transitions in leaderboard and agent modal
  - Animated map speech bubble and POI tooltip transitions
- Updated shell wiring:
  - `SpectatorShell` now sources drawer state from shared store
  - `SpectatorShell` pushes error toasts when world-state sync fails
- Accessibility hardening started:
  - Keyboard row selection support for leaderboard player rows (Enter/Space)
  - Agent modal now restores prior focus and traps Tab focus while open
  - Mobile leaderboard drawer closes on `Escape` and exposes `aria-expanded`/`aria-controls`
  - Mobile leaderboard drawer now traps keyboard focus while open and restores prior focus on close

## Fixes and Stabilization Notes

- Fixed a Pixi init ordering issue where the React camera state could be computed before the Pixi scene was ready, leaving the map at a default transform while HTML overlays used the fitted camera.
  - Solution: add a lightweight `sceneVersion` state in `WorldMap` so resize/camera/draw effects re-run after Pixi `app.init()` completes.
- Updated the seed POI coordinates to a larger world-coordinate system to improve default framing and make parity screenshot runs consistently readable.
- Implemented basic mobile touch gestures on the map (single-finger pan, pinch-to-zoom) while keeping `+ / − / Reset` controls as the fallback interaction model.
