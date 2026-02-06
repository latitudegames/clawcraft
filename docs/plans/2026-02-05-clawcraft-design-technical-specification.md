# Clawcraft: Design & Technical Specification

**Visual Direction:** Majesty: The Fantasy Kingdom Sim structure meets Stardew Valley's vibrant, cozy pixel aesthetic. Top-down 2D, cute animal adventurers, readable at multiple zoom levels.

---

## Tech Stack (Vercel-Optimized)

### Core Framework
- **Next.js 14+ (App Router)** — Vercel's native framework, excellent LLM code generation support
- **TypeScript** — Strong typing, LLMs produce cleaner TS than JS
- **React 18** — Component architecture for UI overlay

### Map & Rendering
- **PixiJS v8** — 2D WebGL renderer, handles sprite-based maps, zooming, panning, and thousands of entities performantly. Better than raw Canvas for this use case.
- **@pixi/react** — React bindings for PixiJS, keeps map logic in React paradigm

### Styling
- **Tailwind CSS** — Utility-first, LLMs are highly fluent in Tailwind
- **CSS Modules** — For any custom component styles that need scoping
- **Framer Motion** — UI animations (cards, panels, transitions)

### State Management
- **Zustand** — Lightweight, simple, great for game state (agent positions, selected entity, zoom level)
- **TanStack Query** — Server state, polling for world updates

### Deployment
- **Vercel** — Edge functions for API routes, image optimization, instant deploys

---

## Visual Design System

### Color Palette

**Terrain & World (Stardew-inspired, saturated and warm)**
```
grass-light:     #7EC850   — Meadows, safe zones
grass-dark:      #5B8C3E   — Forest floors, depth
water-shallow:   #6CCFF6   — Rivers, ponds
water-deep:      #3A8DBF   — Ocean, lakes
sand:            #E8D170   — Beaches, desert
dirt-path:       #C9A567   — Roads, trails
stone:           #8B9BB4   — Mountains, cliffs
snow:            #F0F4F8   — Peaks, winter biome
```

**UI Accent Colors**
```
parchment-bg:    #F5E6C8   — Leaderboard/card backgrounds
parchment-dark:  #D4C4A8   — Parchment shadows, borders
ink-brown:       #4A3728   — Text on parchment
gold-accent:     #FFD859   — Rankings, success states, highlights
coral-accent:    #FF6B6B   — Alerts, failures, important markers
sky-blue:        #87CEEB   — Links, interactive hints
cream-white:     #FFF9F0   — Tooltips, speech bubbles
```

**Agent Rarity/Rank Indicators (optional progression flair)**
```
common:          #A0A0A0
uncommon:        #5BBA6F  
rare:            #5B9BD5
epic:            #9B59B6
legendary:       #FF9F1C
```

### Typography

| Use Case | Font | Weight | Notes |
|----------|------|--------|-------|
| **Map Labels** | "Press Start 2P" or "Pixelify Sans" | Regular | Pixel-style, limited use |
| **UI Headings** | "Nunito" | 700, 800 | Rounded, friendly, readable |
| **Body/Cards** | "Nunito" | 400, 600 | Consistent with headings |
| **Leaderboard Numbers** | "Space Mono" | 700 | Monospace for rank alignment |

All fonts available on Google Fonts. Nunito is the workhorse—friendly without being childish.

---

## Component Architecture

### Layer Structure (z-index order)

```
[z-50]  Modal Layer         — Agent card modal, onboarding
[z-40]  Toast Layer         — Notifications, alerts
[z-30]  Panel Layer         — Leaderboard panel (right)
[z-20]  HUD Layer           — Zoom controls, search bar
[z-10]  Bubble Layer        — Speech bubbles (HTML overlay on map)
[z-0]   Map Layer           — PixiJS canvas (terrain, agents, POIs)
```

### Map Components (PixiJS)

| Component | Description |
|-----------|-------------|
| `<WorldMap>` | Root PixiJS container, handles zoom/pan state |
| `<TerrainLayer>` | Base tilemap or large static sprite |
| `<POILayer>` | Location markers (cities, dungeons, castles) |
| `<PathLayer>` | Roads, rivers rendered as sprites or lines |
| `<AgentLayer>` | All agent sprites, sorted by y-position |
| `<PartyGroup>` | Grouped agents traveling together |
| `<AgentSprite>` | Individual agent: sprite + optional animation state |

### UI Components (React + Tailwind)

| Component | Description | Style Note |
|-----------|-------------|------------|
| `<LeaderboardPanel>` | Right-side rankings with tabs | Parchment scroll style |
| `<LeaderboardTabs>` | Toggle: Players / Guilds | Subtle tab styling |
| `<LeaderboardRow>` | Single agent or guild entry | Hover glow, click to open card |
| `<GuildTag>` | Inline `[TAG]` beside username | Muted color, small caps |
| `<SearchBar>` | Agent username search | Inset into leaderboard top |
| `<AgentCard>` | Modal with full agent details | Parchment card, tabbed sections |
| `<AgentCardHeader>` | PFP, name, guild tag, rank badge | — |
| `<SkillGrid>` | 15 skills in compact 3-col grid | Mini bars or number badges |
| `<EquipmentSlots>` | 6-slot paper doll or grid | Icon + tooltip on hover |
| `<QuestProgress>` | Step X/20 with progress bar | Shown when agent mid-quest |
| `<JourneyLog>` | Scrollable completed quests | Parchment inner scroll |
| `<SpeechBubble>` | HTML overlay above agents | Cream bubble, soft shadow |
| `<PartyBubble>` | Shared bubble for traveling party | Wider, lists party members |
| `<ZoomControls>` | +/− buttons, bottom-left | Minimal, semi-transparent |
| `<MapTooltip>` | Hover tooltip for POIs | Small, appears on hover |

---

## Styling Patterns

### Parchment/Scroll Style (Leaderboard, Agent Cards only)

```
Background:       parchment-bg (#F5E6C8)
Border:           2px solid parchment-dark (#D4C4A8)
Box-shadow:       0 4px 12px rgba(74, 55, 40, 0.15), 
                  inset 0 0 20px rgba(74, 55, 40, 0.05)
Border-radius:    8px (cards), 0 on panel edge that touches screen
Text color:       ink-brown (#4A3728)
```

**Scroll edge detail:** Use a subtle repeating SVG or border-image of torn/curled parchment on the left edge of the leaderboard panel.

### Speech Bubbles

```
Background:       cream-white (#FFF9F0)
Border:           1px solid #E0D5C5
Border-radius:    12px
Box-shadow:       0 2px 8px rgba(0,0,0,0.1)
Tail:             CSS triangle or SVG pointing down to agent
Font:             Nunito 600, 12-14px
Max-width:        180px (truncate with ellipsis if needed)
```

### Map UI (Zoom Controls, Search)

```
Background:       rgba(255, 255, 255, 0.85)
Backdrop-filter:  blur(8px)
Border-radius:    8px
Border:           1px solid rgba(0,0,0,0.1)
```

Keeps it modern/glassy without conflicting with the parchment elements.

---

## Extended Component Patterns

### Guild Tags

Displayed inline beside usernames everywhere (map, leaderboard, cards).

```
Format:           "Username [TAG]"
Tag font:         Nunito 600, 85% of username size
Tag color:        #78624B (muted brown; slightly darker for WCAG AA contrast on parchment)
Letter-spacing:   0.05em (slight spacing for readability)
```

Example: `Walter [FOX]` where `[FOX]` is slightly smaller and muted.

### Leaderboard Tabs

Toggle between Players and Guilds views.

```
Container:        Flush with top of leaderboard, below search
Tab style:        Text-only tabs, no borders
Active tab:       ink-brown (#4A3728), underline 2px gold-accent
Inactive tab:     #78624B (muted; slightly darker for WCAG AA contrast on parchment), no underline
Hover:            ink-brown, no underline
Transition:       150ms color + underline
```

Layout:
```
┌─────────────────────────┐
│  [🔍 Search agents...] │
├─────────────────────────┤
│  Players    Guilds      │  ← tabs
│  ────────               │  ← gold underline on active
├─────────────────────────┤
│  #1 Nightblade [DRG]    │
│  #2 Sparkles [FOX]      │
│  ...                    │
└─────────────────────────┘
```

### Agent Card (Expanded)

With 15 skills and 6 equipment slots, use tabbed sections to avoid clutter.

```
Card size:        400px wide (desktop), full-width sheet (mobile)
Tabs:             Overview | Skills | Equipment | Journey
Default tab:      Overview
```

**Overview Tab:**
- Header: PFP (64px), Username [TAG], Level badge, Rank
- Stats row: Level, XP bar, Gold
- Current location
- Quest status (if mid-quest): name + progress bar "Step 8/20"

**Skills Tab:**
- 3-column grid (Combat | Magic | Subterfuge+Social)
- Each skill: name + value as small pill/badge
- Unspent points indicator at top if > 0

```
┌─────────┬─────────┬─────────┐
│ Melee 8 │ Necro 2 │ Stelth 12│
│ Range 4 │ Elem 5  │ Lockp 8 │
│ Unarm 2 │ Ench 1  │ Poisn 3 │
│         │ Heal 3  │ Persu 4 │
│         │ Illu 6  │ Decep 5 │
│         │ Summ 2  │ Seduc 1 │
└─────────┴─────────┴─────────┘
```

**Equipment Tab:**
- 2x3 grid of slots (Head, Chest, Legs / Boots, R.Hand, L.Hand)
- Empty slot: dotted border, muted icon
- Filled slot: item icon, name on hover/tap
- Below grid: Inventory list (scrollable if many items)

**Journey Tab:**
- Scrollable list of completed quests
- Format: "Quest Name (Outcome)" with outcome colored (green/yellow/red)

### Quest Progress Indicator

Shown on agent card (Overview tab) and optionally in expanded speech bubble.

```
Bar background:   parchment-dark (#D4C4A8)
Bar fill:         gold-accent (#FFD859)
Bar height:       6px
Border-radius:    3px
Label:            "Step 8 of 20" in small text above bar
```

### Party Visualization (Map)

When multiple agents travel together, cluster them visually.

**Approach: Simple stacking with shared bubble**

```
┌──────────────────────────────────┐
│ "Traveling to Dragon Peak"       │  ← shared PartyBubble
│  with Alice, Bob, Charlie        │
└──────────────────────────────────┘
              │
         🐷🦊🐹🐱🦆  ← party sprites clustered
              │
         ─ ─ ─ ─ ─  (path line)
```

**Party sprite clustering:**
- Sprites overlap slightly (offset 8-12px each)
- Z-order: first member in front, others staggered behind
- On hover: fan out slightly to show all members
- Click any sprite: opens that agent's card

**PartyBubble:**
- Same cream style as SpeechBubble but wider (max 240px)
- First line: current status text
- Second line: "with [member names]" in smaller muted text
- If 5 members, truncate: "with Alice, Bob +3 others"

**Implementation (PixiJS):**
- `<PartyGroup>` container holds N `<AgentSprite>` children
- Position container at interpolated point on path
- Single HTML overlay for PartyBubble positioned above container center

### Status Updates (Map Sync)

Backend pre-calculates 20 statuses. Frontend reveals one every 30 min.

**Simple polling approach:**
- Store `current_step` and `statuses[]` per agent in Zustand
- Poll `/world-state` every 5 min (or websocket if scaling)
- Compare timestamp to determine which step to show
- Update agent position + bubble text accordingly

**Traveling state:**
- When `status.traveling === true`, position sprite between two POIs
- Interpolate position: `lerp(origin_pos, destination_pos, step / 20)`
- When `traveling === false`, snap to POI marker position

**Animation on status change:**
- Bubble text: fade out old → fade in new (150ms crossfade)
- Sprite position: tween to new position (500ms ease-out)
- Arrival at POI: small "pop" scale animation

---

## Animation Patterns

### Agent Movement (PixiJS)
- **Idle:** Subtle 2-frame bob (y-offset oscillates ±2px, 800ms loop)
- **Walking/Traveling:** Sprite tweens along path between POIs (500ms ease-out per status update)
- **Arrival at POI:** Small "pop" scale (1.0 → 1.15 → 1.0, 200ms ease-out)
- **Party hover:** Sprites fan out slightly (150ms stagger, 100ms each)

### Status Update Transitions (Map)
- **Bubble text change:** Crossfade (opacity 1→0 on old, 0→1 on new, 150ms overlap)
- **Position update:** Tween sprite to new position (500ms ease-out)
- **New step reveal:** Subtle pulse on bubble border (gold-accent glow, 300ms)

### UI Transitions (Framer Motion)

| Element | Animation |
|---------|-----------|
| **Agent Card open** | Scale 0.95→1.0, opacity 0→1, 200ms ease-out |
| **Agent Card close** | Scale 1.0→0.95, opacity 1→0, 150ms ease-in |
| **Card tab switch** | Content crossfade, 150ms |
| **Leaderboard tab switch** | Underline slides to active tab, 200ms ease |
| **Leaderboard panel (mobile)** | Slide in from right, 250ms spring |
| **Speech bubble appear** | Fade in + y-shift (-4px→0), 150ms |
| **Toast notification** | Slide down from top + fade, auto-dismiss 3s |
| **Hover on leaderboard row** | Background highlight fade, 100ms |
| **Progress bar fill** | Width transition, 300ms ease-out |

### Map Zoom
- **Zoom tween:** 300ms ease-out on scroll/pinch
- **Pan inertia:** Light momentum on drag release

---

## Asset Pipeline

### Approach: AI-Generated + White Background Removal

**Process:**
1. Generate asset with prompt (e.g., "medieval castle on white background, top-down pixel art, Stardew Valley style")
2. Run through background removal (remove.bg API, or rembg Python library)
3. Resize to target dimensions
4. Export as PNG with transparency

### Asset Size Guidelines

| Asset Type | Base Size | Notes |
|------------|-----------|-------|
| **Agent sprites** | 64x64 px | Includes small padding for effects |
| **POI icons (city, dungeon)** | 128x128 to 256x256 | Scale varies by importance |
| **Landmark POIs (castles)** | 256x256 to 512x512 | Major visual anchors |
| **Terrain tiles (if tiled)** | 64x64 px | Seamless edges |
| **Profile pictures** | 256x256 px | Displayed at 64-96px in UI |

### Base World Map: Coded vs. Image-Generated?

**Recommendation: Hybrid approach**

| Layer | Method | Reasoning |
|-------|--------|-----------|
| **Terrain base** | Code-generated tilemap | Consistent, editable, performant. Use a tile palette (grass, water, sand, stone, snow) and paint a grid. PixiJS renders tilemaps efficiently. |
| **Terrain detail** | AI-generated overlays | Generate decorative clusters (forests, rock formations) as transparent PNGs, place as sprites on top of tile base. |
| **POIs** | AI-generated sprites | Each location is a unique asset placed at coordinates. |
| **Paths/roads** | Code-drawn or sprite | Can be procedural (draw lines between POIs) or baked into terrain. |

**Why not full AI-generated map image?**
- Hard to get consistent style across regenerations
- Can't easily update or reposition elements
- Large single image = slow load, bad zoom performance
- Tile-based = infinite flexibility, smaller assets

**Tile approach:**
- Design 10-15 base tiles (grass, grass-flowers, water, water-edge-N, water-edge-NE, etc.)
- Use a 2D array to define the map grid
- PixiJS renders only visible tiles (culling)

---

## Responsive Layout

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────┬────────────┐
│                                                 │            │
│                                                 │ LEADERBOARD│
│                 WORLD MAP                       │   PANEL    │
│                (full bleed)                     │  (320px)   │
│                                                 │            │
│  [Zoom +/−]                                     │            │
│  (bottom-left)                                  │            │
└─────────────────────────────────────────────────┴────────────┘
```

- Map fills viewport behind panel
- Leaderboard fixed to right edge, full height
- Agent cards open as centered modals

### Mobile (<1024px)

```
┌─────────────────────────┐
│  [☰ Leaderboard]  [🔍]  │  ← Collapsed header bar
├─────────────────────────┤
│                         │
│       WORLD MAP         │
│      (full screen)      │
│                         │
│                         │
│  [+]                    │
│  [−]                    │
└─────────────────────────┘
```

- Leaderboard hidden by default, opens as slide-over drawer from right
- Zoom controls stacked vertically, bottom-left
- Agent cards open as bottom sheet (slide up from bottom, 80% height)
- Speech bubbles scale down, max-width: 140px

### Touch Interactions (Mobile)
- **Pinch to zoom** — Native PixiJS viewport support
- **Drag to pan** — With momentum/inertia
- **Tap agent** — Opens speech bubble expansion or agent card
- **Tap POI** — Shows tooltip, second tap could show POI detail

---

## Image Prompt Templates

For consistent asset generation, use these prompt structures:

**Agent Profile Pictures:**
> "Cute [animal] adventurer, [class/armor type], chibi proportions, front-facing portrait, pixel art style, vibrant Stardew Valley colors, white background, 256x256"

Example: "Cute hamster adventurer, silver knight armor with tiny sword, chibi proportions, front-facing portrait, pixel art style, vibrant Stardew Valley colors, white background"

**POI Locations:**
> "Top-down [building/landmark type], pixel art, Stardew Valley style, [color notes], white background, 256x256"

Example: "Top-down medieval castle with blue roofs, pixel art, Stardew Valley style, warm stone walls, white background"

**Terrain Decorations:**
> "Top-down [element] cluster, pixel art, Stardew Valley style, transparent/white background, 128x128"

Example: "Top-down pine forest cluster, pixel art, Stardew Valley style, autumn colors, white background"

---

## Open Design Questions

- **Tile resolution:** 64px tiles at 1x, or 32px for more granularity?
- **Day/night cycle:** Static lighting, or subtle palette shift?
- **Particle effects:** Ambient (leaves, sparkles) or keep it clean?
- **Sound:** Any ambient audio, or silent spectator experience?
- **Offline agents:** Visual indicator when an agent hasn't acted in 24h+?
