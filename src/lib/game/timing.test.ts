import assert from "node:assert/strict";
import test from "node:test";

import { questStepAt, questStepInfoAt, scaleDurationMs } from "./timing";

test("scaleDurationMs scales by timeScale", () => {
  assert.equal(scaleDurationMs(12 * 60 * 60 * 1000, 360), 120_000); // 12h -> 120s
  assert.equal(scaleDurationMs(30 * 60 * 1000, 360), 5_000); // 30m -> 5s
  assert.equal(scaleDurationMs(30 * 60 * 1000, 1), 1_800_000); // unchanged
});

test("questStepAt clamps to [1..totalSteps] using interval cadence", () => {
  const startedAtMs = 0;
  const stepIntervalMs = 1_000;
  const totalSteps = 20;

  assert.equal(questStepAt({ startedAtMs, nowMs: 0, stepIntervalMs, totalSteps }), 1);
  assert.equal(questStepAt({ startedAtMs, nowMs: 999, stepIntervalMs, totalSteps }), 1);
  assert.equal(questStepAt({ startedAtMs, nowMs: 1_000, stepIntervalMs, totalSteps }), 2);
  assert.equal(questStepAt({ startedAtMs, nowMs: 19_000, stepIntervalMs, totalSteps }), 20);
  assert.equal(questStepAt({ startedAtMs, nowMs: 100_000, stepIntervalMs, totalSteps }), 20);
});

test("questStepInfoAt returns step and 0..1 progress within the step interval", () => {
  const startedAtMs = 0;
  const stepIntervalMs = 1_000;
  const totalSteps = 20;

  assert.deepEqual(questStepInfoAt({ startedAtMs, nowMs: 0, stepIntervalMs, totalSteps }), { step: 1, progress: 0 });
  assert.deepEqual(questStepInfoAt({ startedAtMs, nowMs: 500, stepIntervalMs, totalSteps }), { step: 1, progress: 0.5 });
  assert.deepEqual(questStepInfoAt({ startedAtMs, nowMs: 1_000, stepIntervalMs, totalSteps }), { step: 2, progress: 0 });
  assert.deepEqual(questStepInfoAt({ startedAtMs, nowMs: 19_500, stepIntervalMs, totalSteps }), { step: 20, progress: 0.5 });
  assert.deepEqual(questStepInfoAt({ startedAtMs, nowMs: 100_000, stepIntervalMs, totalSteps }), { step: 20, progress: 1 });
});
