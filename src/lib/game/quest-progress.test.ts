import assert from "node:assert/strict";
import test from "node:test";

import { questProgressAt } from "./quest-progress";

test("questProgressAt returns current step and matching status text", () => {
  const startedAtMs = 0;
  const stepIntervalMs = 1_000;
  const totalSteps = 20;
  const statuses = Array.from({ length: totalSteps }, (_v, idx) => ({ step: idx + 1, text: `s${idx + 1}` }));

  assert.deepEqual(
    questProgressAt({ startedAtMs, nowMs: 2_500, stepIntervalMs, totalSteps, statuses }),
    { currentStep: 3, totalSteps: 20, statusText: "s3" }
  );
});

test("questProgressAt falls back to latest known status text when current step is missing", () => {
  const startedAtMs = 0;
  const stepIntervalMs = 1_000;
  const totalSteps = 20;
  const statuses = [
    { step: 1, text: "hello" },
    { step: 2, text: "there" }
  ];

  assert.deepEqual(
    questProgressAt({ startedAtMs, nowMs: 2_500, stepIntervalMs, totalSteps, statuses }),
    { currentStep: 3, totalSteps: 20, statusText: "there" }
  );
});

test("questProgressAt returns null status text when no updates exist", () => {
  const startedAtMs = 0;
  const stepIntervalMs = 1_000;
  const totalSteps = 20;

  assert.deepEqual(
    questProgressAt({ startedAtMs, nowMs: 2_500, stepIntervalMs, totalSteps, statuses: [] }),
    { currentStep: 3, totalSteps: 20, statusText: null }
  );
});
