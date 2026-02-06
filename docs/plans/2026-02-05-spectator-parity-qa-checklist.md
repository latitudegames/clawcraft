# Spectator Parity QA Checklist

Date: 2026-02-05  
Scope: Spectator UI parity vs:
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`
- `docs/plans/2026-02-05-clawcraft-v1-updated.md`

## Verification Summary (Automated)

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm test`
- [x] `npm run dev:a11y` (axe-core + Playwright; requires local server)

## Desktop Parity Checklist

- [x] Full-bleed map shell with fixed right leaderboard panel (`320px`)
- [x] Camera fit/focus respects the right panel inset (content centers in visible map region, not behind the panel)
- [x] Pixi scene camera transform stays in sync with HTML overlays (no bubble/map drift on initial load)
- [x] Parchment panel styling and text-tab leaderboard treatment
- [x] Agent modal tab IA (`Overview`, `Skills`, `Equipment`, `Journey`)
- [x] Bubble rendering with party member summary text
- [x] POI hover/tap tooltip behavior
- [x] Zoom controls and center-focus control behavior
- [x] Manual screenshot comparison run captured
- [x] Typography/spacing fidelity polish pass

## Mobile Parity Checklist

- [x] Top-bar action controls
- [x] Leaderboard slide-over drawer
- [x] Agent modal bottom-sheet behavior
- [x] Drawer close overlay + explicit close action
- [x] Drawer `Escape` close handling
- [x] Drawer focus trap + focus restore
- [x] Map touch gestures supported (single-finger pan, pinch-to-zoom) with `+ / − / Reset` fallback controls
- [x] Manual screenshot run captured
- [ ] Touch behavior walkthrough (real device) for pinch/pan comfort

## Accessibility Checklist (Current)

- [x] Modal keyboard escape support
- [x] Modal focus trap and focus restoration
- [x] Leaderboard row keyboard selection (`Enter`/`Space`)
- [x] Drawer accessibility wiring (`aria-expanded`, `aria-controls`, dialog semantics)
- [x] Toast live-region semantics (`role="status"`, `aria-live`)
- [x] Contrast audit pass (axe-core across baseline + drawer + modal; `npm run dev:a11y`)
- [x] Screen-reader semantics smoke (role-based checks; `npm run dev:sr`)
- [ ] Screen-reader navigation walkthrough (see `docs/plans/2026-02-06-screen-reader-navigation-walkthrough.md`)

## Performance & Runtime Checklist

- [x] Prod-safe world-state polling defaults with dev override
- [x] World-state endpoint cache + in-flight dedupe
- [x] Build and runtime stability under current test suite
- [x] World-state perf baseline recorded (`npm run dev:perf:world-state`)
- [ ] Manual interaction profiling under demo population load (frontend)

## Remaining Gaps

1. Typography/spacing still need a tighter pass for parity-level polish (leaderboard + modal).
2. Screen-reader navigation walkthrough remains to be done (beyond semantics smoke).
3. Manual interaction profiling under demo population load is still pending (frontend performance).
4. Optional ambient effects (particles/day-night palette shift) are intentionally deferred until parity QA closes.

## QA Artifacts

- `docs/plans/artifacts/2026-02-05-parity/desktop-overview.png`
- `docs/plans/artifacts/2026-02-05-parity/desktop-agent-modal.png`
- `docs/plans/artifacts/2026-02-05-parity/mobile-overview.png`
- `docs/plans/artifacts/2026-02-05-parity/mobile-leaderboard-drawer.png`
- `docs/plans/artifacts/2026-02-05-parity/mobile-agent-sheet.png`
