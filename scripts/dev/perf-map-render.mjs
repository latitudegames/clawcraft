#!/usr/bin/env node
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const SYNTH_AGENTS = Number.parseInt(process.env.SYNTH_AGENTS ?? "2000", 10);
const SYNTH_STATUS = Number.parseFloat(process.env.SYNTH_STATUS ?? "0.15");
const SYNTH_PARTY = Number.parseFloat(process.env.SYNTH_PARTY ?? "0.12");
const SYNTH_SEED = process.env.SYNTH_SEED ?? "perf";
const SAMPLE_MS = Number.parseInt(process.env.SAMPLE_MS ?? "3000", 10);
const WARMUP_MS = Number.parseInt(process.env.WARMUP_MS ?? "1500", 10);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function percentile(values, p) {
  if (!values.length) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.round((p / 100) * (sorted.length - 1));
  return sorted[clamp(idx, 0, sorted.length - 1)];
}

function mean(values) {
  if (!values.length) return NaN;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

async function main() {
  if (!Number.isFinite(SYNTH_AGENTS) || SYNTH_AGENTS <= 0) {
    throw new Error("SYNTH_AGENTS must be a positive integer");
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("synth_agents", String(SYNTH_AGENTS));
  url.searchParams.set("synth_status", String(SYNTH_STATUS));
  url.searchParams.set("synth_party", String(SYNTH_PARTY));
  url.searchParams.set("synth_only", "1");
  url.searchParams.set("synth_seed", SYNTH_SEED);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 15_000 });
    await page.waitForTimeout(WARMUP_MS);

    const deltas = await page.evaluate(async ({ sampleMs }) => {
      const frames = [];
      const start = performance.now();
      let last = start;
      let count = 0;

      return await new Promise((resolve) => {
        function tick(ts) {
          count += 1;
          const dt = ts - last;

          // Ignore initial rAF noise for a few frames.
          if (count > 10) frames.push(dt);
          last = ts;

          if (ts - start >= sampleMs) resolve(frames);
          else requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      });
    }, { sampleMs: SAMPLE_MS });

    const avg = mean(deltas);
    const p50 = percentile(deltas, 50);
    const p95 = percentile(deltas, 95);
    const fps = avg > 0 ? 1000 / avg : NaN;

    console.log("Clawcraft spectator render perf (headless)");
    console.log(`URL: ${url.toString()}`);
    console.log(`Sample: ${SAMPLE_MS}ms (warmup ${WARMUP_MS}ms)`);
    console.log(`Frames: ${deltas.length}`);
    console.log(`Frame ms: avg=${avg.toFixed(2)} p50=${p50.toFixed(2)} p95=${p95.toFixed(2)}`);
    console.log(`FPS (approx): ${fps.toFixed(1)}`);

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

