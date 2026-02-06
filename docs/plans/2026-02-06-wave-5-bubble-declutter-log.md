# Wave 5 Implementation Log (Bubble Declutter)

Date: 2026-02-06  
Parent tracker: `docs/plans/2026-02-05-product-repo-improvement-tracker.md`

## Goal

Make speech bubbles readable at dense hotspots, per the design spec’s “readable at multiple zoom levels” requirement.

## Changes

- When zoomed out, solo non-traveling bubbles are grouped by nearest POI (re-using the existing group-bubble UI with a member summary).
- Bubble selection is biased toward groups near the viewport center (after focus bubble), instead of arbitrary alphabetical selection.
- Updated parity screenshots after the change.

## Files Touched

- `src/components/spectator/WorldMap.tsx`
- `docs/plans/artifacts/2026-02-05-parity/*`

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run dev:parity:screenshots`
- `npm run dev:a11y`
- `npm run dev:sr`

