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
- Improve world “feel” to match the visual spec:
  - Biomes are legible as **regions** (not just circles around POIs).
  - POIs feel biome-specific (desert town vs forest town).
  - Decoration variety prevents copy/paste repetition at 100+ POIs.

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
- Bespoke sprite icons for a growing set of “signature POIs” (if assets exist)
- Generic POI icon sprites per `LocationType`
  - Uses PNGs when available: `public/assets/poi/icon-*.png`
  - Falls back to in-browser procedural pixel icons if missing

Code: `src/components/spectator/WorldMap.tsx`

### Biomes + decoration overlays

To align with the spec’s “hybrid approach” (tile base + overlay sprites), the spectator map renders:
- Background: a deterministic **biome region fill** (low-res “tile field” scaled up with nearest-neighbor)
- Midground: macro decor clusters scattered across biome regions
  - Current assets: `public/assets/decor/decor-macro-*.png`
- Foreground: micro decor clusters around each POI
  - Current assets: `public/assets/decor/decor-*.png`
  - Loaded best-effort; falls back to procedural decor if an asset is missing

## Acceptance Criteria

1. `SEED_WORLD=large npm run dev:seed` creates >= 100 locations and a connected connection graph.
2. Opening `/` shows a multi-biome world with:
   - POI icons rendered for every POI
   - Major city + landmark labels visible at default fit zoom
3. `npm run dev:demo -- --party` yields visible agent activity across multiple POIs (not all in one hotspot).
4. Large world visuals have **biome variety at multiple scales**:
   - Background: biome regions read at default “fit” zoom (macro terrain).
   - Midground: per-biome “macro clusters” (large overlays) break up emptiness between POIs.
   - Foreground: per-biome “micro decorations” (64x64) are varied enough to avoid obvious repetition.

## Next Steps

1. **Readability tuning**
   - Road density: reduce long, overlapping cross-region routes.
   - Label thresholds: confirm desktop and mobile “default fit” shows the right subset.
2. **Biome richness**
   - Current:
     - 6 micro decoration overlay variants per biome (64x64) selected deterministically per POI.
     - 2 macro decor cluster variants per biome (256x256) placed deterministically across biome regions.
     - Signature POI sprites for major cities + a few landmarks (biome-aware).
     - Generic POI icon sprites per `LocationType` (fallback).
   - Next (make this the source-of-truth target for “variety”):
     - Micro decorations: **6 variants per biome** (64x64). (done)
     - Macro clusters: **2 variants per biome** (256x256, transparent PNG) placed deterministically in each biome region. (done)
     - Signature POIs: **10-15 biome-aware POI sprites** (128-256px) to replace generic icons for major towns/landmarks. (done, initial set)
       - Examples: castle, port, mine, shrine, ruins gate, wizard tower, desert oasis town, snowy keep, etc.
     - Next target for “more variety” without exploding asset count:
       - Per-biome `LocationType` variants for towns + dungeons (forest town vs desert town, etc.)
       - Add 2-4 additional macro cluster variants for biomes that still feel repetitive at 100+ POIs (forest/plains likely first)
     - Region backgrounds: replace “biome circles around POIs” with **biome region fill** so terrain is legible at default zoom. (done)
   - Asset creation pipeline remains:
     - `docs/plans/2026-02-04-visual-assets-pipeline.md`
3. **Quality pass on POI naming + descriptions**
   - Add region flavor and “signature” landmarks (castle/library/port/etc).
4. **Scale testing**
   - Re-run spectator perf harness under large-world baseline:
     - `/api/world-state?synth_agents=2000&synth_only=1`
     - `npm run dev:perf:map-render`
