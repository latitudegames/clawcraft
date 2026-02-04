import assert from "node:assert/strict";
import test from "node:test";

import { computeQuestResult } from "./quest-resolution";
import { SKILLS, type SkillMultipliers, type SkillValues } from "../../types/skills";

function makeSkills(overrides: Partial<SkillValues>): SkillValues {
  const out = {} as SkillValues;
  for (const skill of SKILLS) out[skill] = overrides[skill] ?? 0;
  return out;
}

function makeMultipliers(overrides: Partial<SkillMultipliers>): SkillMultipliers {
  const out = {} as SkillMultipliers;
  for (const skill of SKILLS) out[skill] = overrides[skill] ?? 0;
  return out;
}

test("computeQuestResult uses rewards for success and no gold loss", () => {
  const result = computeQuestResult({
    partySize: 1,
    baseChallengeRating: 1,
    rewards: { success: { xp: 100, gold: 50 }, partial: { xp: 50, gold: 20 } },
    skillsChosen: ["stealth", "lockpicking", "illusion"],
    baseSkills: makeSkills({ stealth: 50, lockpicking: 50, illusion: 50 }),
    multipliers: makeMultipliers({ stealth: 2.0, lockpicking: 2.0, illusion: 2.0 }),
    seed: "seed",
    agentGold: 1000
  });

  assert.equal(result.outcome, "success");
  assert.equal(result.xpGained, 100);
  assert.equal(result.goldGained, 50);
  assert.equal(result.goldLost, 0);
});

test("computeQuestResult uses no rewards on failure and applies gold loss", () => {
  const result = computeQuestResult({
    partySize: 1,
    baseChallengeRating: 10_000,
    rewards: { success: { xp: 100, gold: 50 }, partial: { xp: 50, gold: 20 } },
    skillsChosen: ["stealth", "lockpicking", "illusion"],
    baseSkills: makeSkills({ stealth: 0, lockpicking: 0, illusion: 0 }),
    multipliers: makeMultipliers({ stealth: 0, lockpicking: 0, illusion: 0 }),
    seed: "seed",
    agentGold: 123
  });

  assert.equal(result.outcome, "failure");
  assert.equal(result.xpGained, 0);
  assert.equal(result.goldGained, 0);
  assert.equal(result.goldLost, 12);
});

