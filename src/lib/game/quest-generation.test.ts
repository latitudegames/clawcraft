import assert from "node:assert/strict";
import test from "node:test";

import { planMockQuestGeneration } from "./quest-generation";

test("planMockQuestGeneration forces a solo quest when none exist", () => {
  assert.deepEqual(planMockQuestGeneration({ existingPartySizes: [], targetCount: 3 }), {
    generateCount: 3,
    forceFirstSolo: true
  });

  assert.deepEqual(planMockQuestGeneration({ existingPartySizes: [2, 3, 4], targetCount: 3 }), {
    generateCount: 1,
    forceFirstSolo: true
  });
});

test("planMockQuestGeneration does not force solo when one already exists", () => {
  assert.deepEqual(planMockQuestGeneration({ existingPartySizes: [1, 2, 3], targetCount: 3 }), {
    generateCount: 0,
    forceFirstSolo: false
  });

  assert.deepEqual(planMockQuestGeneration({ existingPartySizes: [1], targetCount: 3 }), {
    generateCount: 2,
    forceFirstSolo: false
  });
});

