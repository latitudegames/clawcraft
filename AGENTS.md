# AGENTS.md (Clawcraft)

These are persistent preferences for Codex agents working in this repository.

## Persistent Agent Preferences

- Request the user for any upgrades to tooling when it will reduce recurring friction.
- The user has granted permission to proceed autonomously (run tests/scripts, adjust local env, use platform CLIs) as long as changes align with the design + game docs.
- Never print secret values in logs or responses. Confirm access without exposing credentials.
- Track recurring friction points and propose durable tooling upgrades proactively.
- After meaningful work, run the global skill `session-self-update` to persist durable learnings and idempotent env/auth notes updates.

## Tooling Access Inventory

- `railway` CLI: installed and authenticated (`railway whoami` works).
- `op` (1Password CLI): installed and authenticated via service-account context (`op whoami` works).
- `rg` (ripgrep): installed.
- Python `PyYAML`: installed for skill scaffolding/validation tooling.
- Postgres CLI (psql) is not installed; use Prisma/Node scripts for DB inspection until installed.

## Skill Inventory Additions

- Global skill `session-self-update` is installed at `/Users/omisverycool/.codex/skills/session-self-update`.
- Global skill `autofix` is installed at `/Users/omisverycool/.codex/skills/autofix`.

## Env Var Management Policy

- Local machine/session env vars can be added, changed, and validated as needed.
- Org/infra env vars can be managed through platform CLIs (for example `railway variable` commands).
- Secrets retrieval and injection can be handled via 1Password CLI (`op read`, `op inject`, `op run`).
- When a required scope, token, or product is missing, ask the user and then complete setup.

## Session Learnings

- Pixi init can race React camera state; WorldMap uses a sceneVersion signal after app.init() to keep map transform and HTML overlays in sync.
- Use the parity screenshot harness (Playwright) plus demo reset/seed to keep visual QA repeatable: npm run dev:parity:screenshots.
- Automated a11y audit covers baseline + mobile drawer + agent modal states (npm run dev:a11y).
- World-state now includes location biome_tag; WorldMap uses it to draw lightweight biome patches (hybrid stand-in for tilemap).
- Keep Pixi Text labels inverse-scaled so they remain screen-sized while zooming (prevents giant/pixelated labels); agent name labels are focused-only.
- Leaderboard and agent modal tabs now have explicit tablist/tab/tabpanel semantics for screen readers.
- Screen-reader semantics smoke test uses role-based Playwright assertions (npm run dev:sr).
- WorldMap now includes wheel-zoom tween + light pan inertia, plus POI label declutter and biome decoration overlays for better design spec parity.
- Use `npm run dev:perf:world-state` to baseline `/api/world-state` latency (hot/cold + parallel) and catch perf regressions.
- Dev-only synthetic load mode: /?synth_agents=<n>&synth_status=<0..1>&synth_party=<0..1>&synth_only=1&... (wired through SpectatorShell and /api/world-state)
- Headless render perf harness: npm run dev:perf:map-render (samples requestAnimationFrame deltas under synthetic load)
