import assert from "node:assert/strict";
import test from "node:test";

import { computePartyQuestResult, computeQuestResult } from "./quest-resolution";
import { rollRandomFactor } from "./formulas";
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

test("computePartyQuestResult sums contributions and applies a single roll for the whole party", () => {
  const seed = "party-seed";
  const result = computePartyQuestResult({
    partySize: 2,
    baseChallengeRating: 10,
    rewards: { success: { xp: 100, gold: 50 }, partial: { xp: 50, gold: 20 } },
    multipliers: makeMultipliers({ stealth: 1, lockpicking: 0, illusion: 0 }),
    seed,
    participants: [
      {
        skillsChosen: ["stealth", "lockpicking", "illusion"],
        baseSkills: makeSkills({ stealth: 30 }),
        agentGold: 1000
      },
      {
        skillsChosen: ["stealth", "lockpicking", "illusion"],
        baseSkills: makeSkills({ stealth: 20 }),
        agentGold: 200
      }
    ]
  });

  assert.equal(result.outcome, "success");
  assert.equal(result.effectiveSkill, 50);
  assert.equal(result.randomFactor, rollRandomFactor(seed));
  assert.equal(result.participants[0]?.contributedEffectiveSkill, 30);
  assert.equal(result.participants[1]?.contributedEffectiveSkill, 20);
  assert.equal(result.participants[0]?.xpGained, 125);
  assert.equal(result.participants[1]?.xpGained, 125);
  assert.equal(result.participants[0]?.goldGained, 50);
  assert.equal(result.participants[1]?.goldGained, 50);
  assert.equal(result.participants[0]?.goldLost, 0);
  assert.equal(result.participants[1]?.goldLost, 0);
});

test("computePartyQuestResult applies gold loss per participant on failure", () => {
  const result = computePartyQuestResult({
    partySize: 2,
    baseChallengeRating: 10_000,
    rewards: { success: { xp: 100, gold: 50 }, partial: { xp: 50, gold: 20 } },
    multipliers: makeMultipliers({ stealth: 0, lockpicking: 0, illusion: 0 }),
    seed: "seed",
    participants: [
      {
        skillsChosen: ["stealth", "lockpicking", "illusion"],
        baseSkills: makeSkills({ stealth: 0 }),
        agentGold: 123
      },
      {
        skillsChosen: ["stealth", "lockpicking", "illusion"],
        baseSkills: makeSkills({ stealth: 0 }),
        agentGold: 50
      }
    ]
  });

  assert.equal(result.outcome, "failure");
  assert.equal(result.participants[0]?.xpGained, 0);
  assert.equal(result.participants[0]?.goldGained, 0);
  assert.equal(result.participants[0]?.goldLost, 12);
  assert.equal(result.participants[1]?.goldLost, 5);
});
