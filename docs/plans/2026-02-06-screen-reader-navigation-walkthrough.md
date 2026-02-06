# Screen-Reader Navigation Walkthrough (Manual)

Date: 2026-02-06  
Scope: Spectator UI parity vs:
- `docs/plans/2026-02-05-clawcraft-design-technical-specification.md`
- `docs/plans/2026-02-05-clawcraft-v1-updated.md`

This is a **manual** QA checklist to run with a screen reader (in addition to the automated semantics smoke `npm run dev:sr`).

## Setup

1. Ensure demo data exists:
   - `npm run dev:demo -- --party`
2. Start dev server:
   - `npm run dev`
3. Open:
   - `http://127.0.0.1:3000/`

## Desktop Walkthrough (VoiceOver/NVDA)

Goal: validate that the right panel, map, and agent modal can be navigated without sight, and that the tab/tabpanel semantics are coherent.

1. Navigate to the desktop leaderboard panel.
   - Expect: a “Leaderboard” heading/label is discoverable.
2. Focus the search input.
   - Expect: accessible name “Search players” (or “Search guilds” after switching tabs).
3. Navigate the leaderboard tabs.
   - Expect: a tablist “Leaderboard tabs”, tabs “Players” and “Guilds”.
   - Arrow keys should switch tabs while keeping focus on the active tab.
4. Navigate into the leaderboard results.
   - Expect: each player is a button with a stable name containing username and optional guild tag.
5. Activate a player row (Enter/Space).
   - Expect: agent modal opens and focus moves inside the dialog.
6. Agent modal navigation.
   - Expect: dialog role is discoverable; “Close” button exists; Escape closes.
   - Tablist “Agent details tabs” with tabs “Overview / Skills / Equipment / Journey”.
   - Arrow keys move between tabs; tabpanel content changes.
7. Close the agent modal and confirm focus restoration (back to the previously focused element).

## Mobile Walkthrough (VoiceOver/TalkBack)

Goal: validate the mobile top-bar and leaderboard drawer model.

1. Focus “Leaderboard” button in the top bar.
   - Expect: `aria-expanded` reflects open/closed state.
2. Open the drawer.
   - Expect: focus moves inside the drawer; a “Close” button is first/early in focus order.
   - Expect: drawer is exposed as a dialog and traps focus.
3. Navigate tabs + player rows inside the drawer (same semantics as desktop).
4. Activate a player row.
   - Expect: agent sheet opens as a dialog; focus moves into it; Escape closes.
5. Close drawer and verify focus restoration.

## Known Limitations

- This walkthrough validates navigation and labeling. It does not validate the actual spoken phrasing across all AT/OS combinations.
- Automated SR smoke is still the “gate” for CI-style checks (`npm run dev:sr`).

