import assert from "node:assert/strict";
import test from "node:test";

import { bubbleLimitForScale, shouldShowAgentLabels, shouldShowLocationLabels } from "./declutter";

test("declutter visibility toggles at expected zoom thresholds", () => {
  assert.equal(shouldShowLocationLabels(0.84), false);
  assert.equal(shouldShowLocationLabels(0.85), true);

  assert.equal(shouldShowAgentLabels(1.09), false);
  assert.equal(shouldShowAgentLabels(1.1), true);
});

test("bubbleLimitForScale reduces bubbles at low zoom", () => {
  assert.equal(bubbleLimitForScale(1.2, false), 30);
  assert.equal(bubbleLimitForScale(0.9, false), 15);
  assert.equal(bubbleLimitForScale(0.75, false), 8);
  assert.equal(bubbleLimitForScale(0.55, false), 0);
  assert.equal(bubbleLimitForScale(0.55, true), 1);
});

