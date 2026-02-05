# LLM Quest Generator (Dev Tool) — Design

Date: 2026-02-05

## Goal

Add a **CLI-only** dev tool that calls OpenRouter to generate a **single quest narrative payload** (name/description/destination/fail destination/nearby POIs) that can later be fed into the quest refresh pipeline.

This is for iterating on **content quality** without changing the deterministic gameplay loop.

## Non-goals / constraints

- No LLM calls in the action request path.
- Do not store API keys in repo; read from `.env` / `.env.local`.
- Keep outputs **strictly validated** (machine-checkable JSON).
- Do not wire LLM directly into the 12h quest refresh job yet (keep scope low).

## Recommended approach

Create `scripts/dev/llm-quest.mjs`:
- Loads env from `.env` / `.env.local`.
- Reads an optional scenario JSON via `--input` (defaults to a built-in example).
- Calls OpenRouter `chat/completions` with `response_format: { type: "json_object" }`.
- Validates response:
  - `destination` must be in `destinations`
  - `fail_destination` must be `null` for party quests
  - `nearby_pois_for_journey` must be 1–3 entries from `available_locations`
- Prints the validated JSON payload and supports `--out` to write to disk.

## Testing plan

- Unit-test the validator + “generate once” path with a fake `fetch` (no CI network calls).

## Success criteria

- `npm run dev:llm:quest` fails fast without `OPENROUTER_API_KEY`.
- With a key, it returns a validated JSON payload matching the expected shape.
- Repo stays green: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

