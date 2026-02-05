# LLM Status Generator (Dev Tool) — Design

Date: 2026-02-05

## Goal

Add a **CLI-only** dev tool that calls OpenRouter to generate the **20 map status updates** for a quest journey (per `game-design.md`) so we can iterate on narrative quality without touching the deterministic simulation loop.

## Non-goals / constraints

- **No LLM calls in the action request path.** This tool is offline/dev-only.
- Do **not** store API keys in repo or logs; read from `.env` / `.env.local`.
- Keep the output **machine-checkable** (strict schema validation).

## Options considered

1. **Extend `scripts/dev/llm-smoke.mjs` with extra modes**
   - Pros: fewer files.
   - Cons: smoke script stops being “smoke”; harder to keep simple.
2. **New script: `scripts/dev/llm-status.mjs`** (recommended)
   - Pros: clean separation; safe to evolve independently; easy to document.
3. **Integrate into background jobs (generate + persist)**
   - Pros: closer to eventual production pipeline.
   - Cons: higher risk; violates “keep scope low”; needs DB + idempotency + ops.

## Recommended approach

Create `scripts/dev/llm-status.mjs`:
- Loads env from `.env` / `.env.local` like `llm-smoke`.
- Uses OpenRouter `chat/completions` with `response_format: { type: "json_object" }`.
- Requests a JSON object: `{ "statuses": [ ...20 items... ] }`.
- Validates shape and core invariants:
  - exactly 20 updates
  - `step` is 1..20 with no duplicates
  - `text` is non-empty and short (fits speech bubble)
  - `location` is one of `available_locations`
  - `traveling_toward` only when `traveling=true`
  - step 1 starts at origin; step 20 ends at destination (or fail destination if failure)
- Prints both:
  - a concise summary (model, ok/failed, error messages)
  - the validated JSON payload (or raw model content on failure)
- Optional `--out <file>` to write the JSON payload to disk.
- Optional `--input <file>` to provide a scenario JSON; default uses a built-in example derived from `mock-llm` inputs.

## Testing plan

- Add unit tests for the validator (pure, deterministic):
  - passes for a valid 20-step payload
  - fails for wrong count / duplicate steps / invalid location / bad traveling fields
- Do **not** add network tests to CI; live calls remain manual via `npm run dev:llm:*`.

## Success criteria

- `node scripts/dev/llm-status.mjs` fails fast without `OPENROUTER_API_KEY`.
- With a valid key, it returns a validated `statuses` array matching the map schema.
- Repo stays green: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

