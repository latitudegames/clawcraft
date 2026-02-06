# World Expansion Plan (Large World, V1)

Date: 2026-02-06  
Scope: scale the Clawcraft world from the demo 5-POI map to a kingdom-scale map aligned with:
- `docs/plans/2026-02-05-clawcraft-v1-updated.md`
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`

## Goals

- Seed a deterministic world with **>= 100 POIs** across biomes and location types.
- Keep the spectator experience readable at multiple zoom levels:
  - At default “fit” zoom: show major cities + landmarks.
  - As you zoom in: reveal towns/dungeons/wild labels.
- Keep the world graph connected and quest generation healthy:
  - Each location has a handful of connections (travel pathing + nearby POI list).
  - Quests can pick destinations via connections.

## Non-Goals (for this phase)

- Final art-quality tiles/overlays everywhere (we’ll stage in real sprites incrementally).
- Perfect lore writing or final naming (we’ll iterate).
- Switching render architecture (no `@pixi/react` migration required to scale POIs).

## Implementation (Current)

### Deterministic world datasets

- Generator: `scripts/dev/generate-world.mjs`
- Output:
  - `data/world/world-v1-large.json` (currently 102 POIs, 187 connections)
  - `data/world/world-v1-small.json` (5 POIs, fast fallback)

### Seeding

`npm run dev:seed` now loads world data from `data/world/`:
- Default: large world
- Override: `SEED_WORLD=small npm run dev:seed`

### Spectator rendering support

To avoid “no icons except 5” when scaling to 100+ POIs, the spectator map uses:
- Bespoke sprite icons for the canonical 5 POIs (if assets exist)
- Generic pixel-style icons per `LocationType` (generated in-browser)

Code: `src/components/spectator/WorldMap.tsx`

## Acceptance Criteria

1. `SEED_WORLD=large npm run dev:seed` creates >= 100 locations and a connected connection graph.
2. Opening `/` shows a multi-biome world with:
   - POI icons rendered for every POI
   - Major city + landmark labels visible at default fit zoom
3. `npm run dev:demo -- --party` yields visible agent activity across multiple POIs (not all in one hotspot).

## Next Steps

1. **Readability tuning**
   - Road density: reduce long, overlapping cross-region routes.
   - Label thresholds: confirm desktop and mobile “default fit” shows the right subset.
2. **Biome richness**
   - Expand biome tags (if needed) with spec-aligned palette and procedural textures.
   - Begin replacing procedural decorations with real overlay sprites per:
     - `docs/plans/2026-02-04-visual-assets-pipeline.md`
3. **Quality pass on POI naming + descriptions**
   - Add region flavor and “signature” landmarks (castle/library/port/etc).
4. **Scale testing**
   - Re-run spectator perf harness under large-world baseline:
     - `/api/world-state?synth_agents=2000&synth_only=1`
     - `npm run dev:perf:map-render`

