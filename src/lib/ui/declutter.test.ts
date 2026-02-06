import assert from "node:assert/strict";
import test from "node:test";

import { agentLabelLimitForScale, bubbleLimitForScale, shouldShowAgentLabels, shouldShowLocationLabels } from "./declutter";

test("declutter visibility toggles at expected zoom thresholds", () => {
  assert.equal(shouldShowLocationLabels(0.94), false);
  assert.equal(shouldShowLocationLabels(0.95), true);

  assert.equal(shouldShowAgentLabels(1.59), false);
  assert.equal(shouldShowAgentLabels(1.6), true);
});

test("bubbleLimitForScale reduces bubbles at low zoom", () => {
  assert.equal(bubbleLimitForScale(1.7, false), 5);
  assert.equal(bubbleLimitForScale(1.7, true), 8);
  assert.equal(bubbleLimitForScale(1.3, false), 3);
  assert.equal(bubbleLimitForScale(1.3, true), 5);
  assert.equal(bubbleLimitForScale(0.95, false), 2);
  assert.equal(bubbleLimitForScale(0.95, true), 3);
  assert.equal(bubbleLimitForScale(0.75, false), 1);
  assert.equal(bubbleLimitForScale(0.75, true), 2);
  assert.equal(bubbleLimitForScale(0.55, false), 0);
  assert.equal(bubbleLimitForScale(0.55, true), 1);
});

test("agentLabelLimitForScale heavily declutters at low zoom", () => {
  assert.equal(agentLabelLimitForScale(2.5, false), 14);
  assert.equal(agentLabelLimitForScale(2.5, true), 18);
  assert.equal(agentLabelLimitForScale(1.9, false), 6);
  assert.equal(agentLabelLimitForScale(1.9, true), 10);
  assert.equal(agentLabelLimitForScale(1.61, false), 3);
  assert.equal(agentLabelLimitForScale(1.61, true), 6);
  assert.equal(agentLabelLimitForScale(1.3, false), 0);
  assert.equal(agentLabelLimitForScale(1.3, true), 1);
});
