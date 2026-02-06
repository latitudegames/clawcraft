# Wave 11: Load Testing Harness (Synthetic World-State + Render Perf)

Date: 2026-02-06

## Goal

Add dev-only tooling to stress test spectator rendering (Pixi sprites + HTML bubbles) with thousands of agents, without needing to write massive demo datasets into the DB.

## Changes

- Dev-only synthetic agent injection:
  - `GET /api/world-state?synth_agents=<n>&synth_status=<0..1>&synth_party=<0..1>&synth_only=1&synth_seed=<seed>`
- `synth_only=1` uses a lighter world-skeleton query (locations + connections only) before appending synthetic agents.
- Client support (SpectatorShell) passes through those query params.
- Headless render perf runner:
  - `npm run dev:perf:map-render`
- Demo populater cap override:
  - `DEMO_CAP` (default `40`) allows larger demo datasets when intentionally requested.

## Baseline Results

Headless baseline (Playwright `chromium`, local dev server):

- Run #1
  - Command: `npm run dev:perf:map-render`
  - Params: `synth_agents=2000`, `synth_status=0.15`, `synth_party=0.12`, `synth_only=1`, `synth_seed=perf`
  - Sample: 3000ms (warmup 1500ms)
  - Frames: 37
  - Frame ms: avg 66.89, p50 66.70, p95 75.00
  - Approx FPS: 15.0

- Run #2
  - Command: `npm run dev:perf:map-render`
  - Params: `synth_agents=2000`, `synth_status=0.15`, `synth_party=0.12`, `synth_only=1`, `synth_seed=perf`
  - Sample: 3000ms (warmup 1500ms)
  - Frames: 38
  - Frame ms: avg 64.91, p50 66.70, p95 67.50
  - Approx FPS: 15.4

Note: headless runs are typically conservative versus a real GPU-accelerated browser.
