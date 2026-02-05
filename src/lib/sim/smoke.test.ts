import assert from "node:assert/strict";
import test from "node:test";

import { runSmokeSimulation } from "./smoke";

test("runSmokeSimulation is deterministic for same seed", () => {
  const a = runSmokeSimulation({ seed: "seed" });
  const b = runSmokeSimulation({ seed: "seed" });
  assert.deepEqual(a, b);
});

test("runSmokeSimulation returns 20 ordered status updates", () => {
  const out = runSmokeSimulation({ seed: "seed" });
  assert.equal(out.statuses.length, 20);
  assert.equal(out.statuses[0].step, 1);
  assert.equal(out.statuses[19].step, 20);
  assert.equal(out.statuses[0].traveling, false);
  assert.equal(out.statuses[19].traveling, false);
});
