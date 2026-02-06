# Wave 6 Implementation Log (POI Label Declutter + Biome Decorations)

Date: 2026-02-06  
Parent tracker: `docs/plans/2026-02-05-product-repo-improvement-tracker.md`

## Goal

Increase map readability and the “cozy pixel world” feel at multiple zoom levels by:
- showing fewer POI labels when zoomed out (based on POI type), and
- adding lightweight biome decoration overlays around POIs.

## Changes

- POI labels now declutter by zoom + location type:
  - `major_city` / `landmark` labels appear earlier (lower zoom) than `town` / `dungeon` / `wild`.
  - Hovered or pinned POI label is always visible.
  - Hide the entire label container when no labels would be visible at the current zoom.
- Added procedural biome decoration textures (tiny trees, flowers, stones, etc.) and scattered decoration sprites within each biome patch radius.
- Updated `dev:sr` smoke to wait for leaderboard rows before attempting modal/sheet checks.
- Refreshed parity screenshots after the change.

## Files Touched

- `src/components/spectator/WorldMap.tsx`
- `scripts/dev/sr-smoke.mjs`
- `docs/plans/artifacts/2026-02-05-parity/*`

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run dev:parity:screenshots`
- `npm run dev:a11y`
- `npm run dev:sr`

