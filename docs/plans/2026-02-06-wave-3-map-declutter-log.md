# Wave 3 Implementation Log (Map Declutter)

Date: 2026-02-06  
Parent tracker: `docs/plans/2026-02-05-product-repo-improvement-tracker.md`

## Goal

Reduce spectator map clutter and make the map readable at multiple zoom levels, per:
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`

## Changes

- Pixi text labels (POI labels, focused agent name label) are now inverse-scaled to remain screen-sized while zooming.
- Agent name labels are limited to focused-only (speech bubbles already contain names).
- Leaderboard parchment panels now keep rounding on the left edge while staying flush to the right screen edge (per spec).
- Updated parity screenshots after the change.

## Files Touched

- `src/components/spectator/WorldMap.tsx`
- `src/components/spectator/SpectatorShell.tsx`

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run dev:parity:screenshots` (updates `docs/plans/artifacts/2026-02-05-parity/`)
