#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const warmupCount = Number(process.env.PERF_WARMUP_COUNT ?? 3);
const hotSequentialCount = Number(process.env.PERF_HOT_SEQ_COUNT ?? 20);
const hotParallelCount = Number(process.env.PERF_HOT_PAR_COUNT ?? 10);
const coldCount = Number(process.env.PERF_COLD_COUNT ?? 8);
const coldDelayMs = Number(process.env.PERF_COLD_DELAY_MS ?? 1100);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function summarizeMs(durationsMs) {
  const total = durationsMs.reduce((a, b) => a + b, 0);
  const mean = durationsMs.length ? total / durationsMs.length : 0;
  return {
    count: durationsMs.length,
    min: Math.min(...durationsMs),
    max: Math.max(...durationsMs),
    mean,
    p50: percentile(durationsMs, 50),
    p95: percentile(durationsMs, 95)
  };
}

async function timedFetchJson(url) {
  const t0 = performance.now();
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const text = await res.text();
  const t1 = performance.now();
  return {
    ok: res.ok,
    status: res.status,
    ms: t1 - t0,
    bytes: Buffer.byteLength(text, "utf8")
  };
}

async function main() {
  const url = `${baseUrl}/api/world-state`;
  console.log(`[perf] target: ${url}`);

  const all = [];

  for (let i = 0; i < warmupCount; i++) {
    all.push(await timedFetchJson(url));
  }

  const hotSeq = [];
  for (let i = 0; i < hotSequentialCount; i++) {
    hotSeq.push(await timedFetchJson(url));
  }

  const hotParResults = await Promise.all(Array.from({ length: hotParallelCount }, () => timedFetchJson(url)));

  const cold = [];
  for (let i = 0; i < coldCount; i++) {
    await sleep(coldDelayMs);
    cold.push(await timedFetchJson(url));
  }

  const assertAllOk = (label, results) => {
    const bad = results.filter((r) => !r.ok);
    if (bad.length) {
      console.error(`[perf] ${label}: ${bad.length} non-OK response(s):`, bad.map((b) => b.status));
      process.exitCode = 1;
    }
  };

  assertAllOk("warmup", all);
  assertAllOk("hot-seq", hotSeq);
  assertAllOk("hot-par", hotParResults);
  assertAllOk("cold", cold);

  const sizes = [...hotSeq, ...hotParResults, ...cold].map((r) => r.bytes);
  const sizeSummary = summarizeMs(sizes);

  const fmt = (n) => `${n.toFixed(1)}ms`;
  const print = (label, results) => {
    const s = summarizeMs(results.map((r) => r.ms));
    console.log(
      `[perf] ${label}: n=${s.count} min=${fmt(s.min)} p50=${fmt(s.p50)} p95=${fmt(s.p95)} mean=${fmt(s.mean)} max=${fmt(s.max)}`
    );
  };

  print("hot-seq", hotSeq);
  print("hot-par", hotParResults);
  print("cold", cold);
  console.log(
    `[perf] payload bytes: n=${sizeSummary.count} min=${sizeSummary.min.toFixed(0)} p50=${sizeSummary.p50.toFixed(
      0
    )} p95=${sizeSummary.p95.toFixed(0)} mean=${sizeSummary.mean.toFixed(0)} max=${sizeSummary.max.toFixed(0)}`
  );
}

main().catch((err) => {
  console.error("[perf] failed");
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});

