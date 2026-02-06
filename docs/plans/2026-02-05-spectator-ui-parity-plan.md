# Spectator UI Parity Plan (Audit + Remediation)

Date: 2026-02-05

## Scope

Assess current implementation parity against:
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`
- `docs/plans/2026-02-05-clawcraft-v1-updated.md`

Focus area:
- Spectator UX/UI (layout, interaction patterns, component architecture, visual system, motion).

Out of scope:
- Re-balancing game formulas
- Reworking stable backend contracts that already match V1 behavior

## Executive Summary

Backend and API behavior are mostly aligned with V1, including:
- Leaderboard sort by level then XP
- 20-status quest runs with 30-minute progression (time-scaled in dev)
- Batched dashboard endpoint
- Guild V1 social/cosmetic behavior
- Programmatic journey log

The primary gap is frontend parity. Current spectator UI is functional but still scaffold-level and does not match the intended visual language, layout model, and interaction model in the design specification.

### Status Update (2026-02-05)

Implementation waves 1-4 have now been applied in-code:
- Foundation + shell parity (desktop fixed panel, mobile drawer/top-bar)
- Component parity (leaderboard tabs/rows, agent modal tab IA + bottom-sheet)
- Map + party parity (layer separation, party bubbles, POI tooltips, party fan-out)
- Motion + timing/state parity (Framer Motion transitions, toast layer, env-aware polling, lightweight Zustand store)

Source-of-truth tracking for the current state lives in:
- `docs/plans/2026-02-05-product-repo-improvement-tracker.md`
- `docs/plans/2026-02-05-spectator-parity-qa-checklist.md`

## Gap Matrix

Note: The "Current State" column below reflects the **pre-remediation audit snapshot**. As of 2026-02-05, Waves 1-4 are implemented in-code; refer to:
- `docs/plans/2026-02-05-product-repo-improvement-tracker.md`
- `docs/plans/2026-02-05-spectator-parity-qa-checklist.md`

| Area | Spec Target | Current State | Priority | Evidence |
|------|-------------|---------------|----------|----------|
| Global layout | Full-bleed map + fixed right leaderboard panel on desktop | Centered card layout with map and leaderboard as sibling blocks | P0 | `src/components/spectator/SpectatorShell.tsx:29`, `src/components/spectator/SpectatorShell.tsx:30`, `src/components/spectator/SpectatorShell.tsx:31`, `src/components/spectator/SpectatorShell.tsx:74` |
| Mobile UX model | Collapsed top bar + slide-over leaderboard + bottom-sheet agent card | Single-column stack; modal is center overlay on all breakpoints | P0 | `src/components/spectator/SpectatorShell.tsx:30`, `src/components/spectator/AgentModal.tsx:29`, `src/components/spectator/AgentModal.tsx:36` |
| Typography system | Nunito + Space Mono + Pixelify/Press Start 2P | No font loading; default font stack | P0 | `src/app/layout.tsx:13`, `src/app/globals.css:16` |
| Leaderboard tab/row styling | Text tabs with active underline, parchment edge style | Pill-like tab buttons; no scroll-edge treatment | P1 | `src/components/spectator/LeaderboardPanel.tsx:40`, `src/components/spectator/LeaderboardPanel.tsx:47`, `src/components/spectator/LeaderboardPanel.tsx:73` |
| Agent card IA | Tabbed sections (Overview/Skills/Equipment/Journey) | Single long panel with all sections visible | P1 | `src/components/spectator/AgentModal.tsx:75` |
| Map component architecture | Explicit terrain/path/POI/agent/party layers and richer terrain treatment | Imperative Pixi scene, basic terrain CSS, no tile terrain layer | P1 | `src/components/spectator/WorldMap.tsx:134`, `src/components/spectator/WorldMap.tsx:141`, `src/components/spectator/WorldMap.tsx:567`, `src/app/globals.css:21` |
| Party bubble behavior | Shared party bubble with member names and truncation rules | Shared bubble shows representative label + `+N` only | P1 | `src/components/spectator/WorldMap.tsx:505` |
| Motion system | Framer Motion transitions for modal/tabs/panel/bubbles/toasts | No Framer Motion usage | P1 | `package.json` dependency only; no `framer-motion` imports in `src/` |
| Polling cadence | Spec guidance: 5-minute polling for world-state baseline | Client polls every 2 seconds | P1 | `src/lib/client/hooks/useWorldState.ts:11`, `src/lib/client/hooks/useWorldState.ts:12` |
| Shared UI state | Zustand for map/UI state | Local component state only | P2 | No Zustand store usage under `src/` |

## Implementation Waves

### Wave 1 (P0): Foundation + shell parity

Deliverables:
- Load and apply typography (Nunito, Space Mono, Pixelify/Press Start 2P).
- Expand global tokens and utility conventions for parchment, map, and HUD layers.
- Refactor spectator shell to full-bleed map with fixed right panel on desktop.
- Implement responsive shell primitives for mobile header and panel toggling.

Primary files:
- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/components/spectator/SpectatorShell.tsx`

Acceptance criteria:
- Desktop map uses viewport height and is not boxed in a centered card.
- Leaderboard panel sits on right edge at target width.
- Typography visibly follows design system roles.

### Wave 2 (P1): Component parity (leaderboard + agent card)

Deliverables:
- Leaderboard tabs switched to text + underline active state.
- Parchment visual treatments improved (edge detail, row hover polish).
- Agent card split into tabs: Overview, Skills, Equipment, Journey.
- Mobile agent card presented as bottom sheet.

Primary files:
- `src/components/spectator/LeaderboardPanel.tsx`
- `src/components/spectator/AgentModal.tsx`
- `src/components/spectator/SpectatorShell.tsx`

Acceptance criteria:
- Agent card no longer shows all sections simultaneously.
- Tab interaction is clear and keyboard-accessible.
- Mobile card interaction matches bottom-sheet behavior.

### Wave 3 (P1): Map visual and interaction parity

Deliverables:
- Strengthen map layer boundaries (`TerrainLayer`, `PathLayer`, `POILayer`, `AgentLayer`, `PartyGroup`) within current Pixi setup or via `@pixi/react`.
- Improve party representation: shared bubble includes member names with truncation.
- Add POI hover/tap tooltip behavior.
- Keep existing interpolation and clustering behavior while improving presentation.

Primary files:
- `src/components/spectator/WorldMap.tsx`
- `src/lib/ui/bubble-groups.ts`
- `src/lib/ui/cluster-layout.ts`

Acceptance criteria:
- Party bubbles communicate membership clearly.
- POIs expose meaningful hover/tap affordances.
- Map readability remains stable at multiple zoom levels.

### Wave 4 (P1): Motion + timing/state parity

Deliverables:
- Add Framer Motion transitions for modal open/close, tab switches, panel movement, and bubble reveal transitions.
- Introduce toast layer scaffolding.
- Update polling defaults to a production-like cadence with explicit dev override.
- Optionally centralize transient UI state in a Zustand store.

Primary files:
- `src/components/spectator/SpectatorShell.tsx`
- `src/components/spectator/LeaderboardPanel.tsx`
- `src/components/spectator/AgentModal.tsx`
- `src/components/spectator/WorldMap.tsx`
- `src/lib/client/hooks/useWorldState.ts`

Acceptance criteria:
- Core interactions animate consistently and feel intentional.
- Polling behavior is configurable by environment, with conservative production default.

## QA Checklist (Done Criteria)

- Desktop and mobile screenshots satisfy layout targets from the design spec.
- Manual walkthrough:
  - Open/close leaderboard on mobile
  - Open/close agent card on desktop/mobile
  - Switch card tabs and leaderboard tabs
  - Follow one party group and verify shared bubble content
- Accessibility checks:
  - Keyboard focus for panel controls and modal interactions
  - Sufficient text contrast after palette updates
- Performance checks:
  - Map remains responsive with current demo population
  - Polling does not produce avoidable request churn in production profile

## Open Decisions Before Build

- Keep imperative Pixi architecture or migrate map renderer incrementally to `@pixi/react`.
- Final tile resolution baseline for terrain layer (32px vs 64px).
- Whether to include ambient map effects in V1 parity pass or defer to post-parity polish.
