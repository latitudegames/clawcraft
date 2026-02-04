import assert from "node:assert/strict";
import test from "node:test";

import { createRng } from "../utils/rng";
import {
  effectiveSkill,
  levelFromTotalXp,
  partyChallengeRating,
  partyXpMultiplier,
  questOutcomeFromSuccessLevel,
  rollRandomFactor,
  successLevel,
  xpRequiredForLevel
} from "./formulas";
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

test("xpRequiredForLevel matches spec table (floor)", () => {
  assert.equal(xpRequiredForLevel(1), 100);
  assert.equal(xpRequiredForLevel(2), 125);
  assert.equal(xpRequiredForLevel(3), 156);
  assert.equal(xpRequiredForLevel(4), 195);
  assert.equal(xpRequiredForLevel(5), 244);
  assert.equal(xpRequiredForLevel(10), 745);
});

test("partyXpMultiplier matches spec", () => {
  assert.equal(partyXpMultiplier(1), 1);
  assert.equal(partyXpMultiplier(2), 1.25);
  assert.equal(partyXpMultiplier(3), 1.5);
  assert.equal(partyXpMultiplier(4), 1.75);
  assert.equal(partyXpMultiplier(5), 2);
});

test("partyChallengeRating scales linearly with party size", () => {
  assert.equal(partyChallengeRating(40, 5), 200);
});

test("effectiveSkill sums (value + bonus) * multiplier for chosen skills", () => {
  const baseSkills = makeSkills({ stealth: 12, lockpicking: 8, illusion: 6 });
  const multipliers = makeMultipliers({ stealth: 1.8, lockpicking: 1.5, illusion: 1.5 });

  const value = effectiveSkill({
    skillsChosen: ["stealth", "lockpicking", "illusion"],
    baseSkills,
    multipliers,
    equipmentBonuses: { stealth: 0 }
  });

  assert.equal(value, 42.6);
});

test("successLevel and outcome thresholds match spec", () => {
  const level = successLevel({ effectiveSkill: 42.6, challengeRating: 35, randomFactor: 7 });
  assert.equal(Number(level.toFixed(1)), 14.6);
  assert.equal(questOutcomeFromSuccessLevel(level), "partial");
  assert.equal(questOutcomeFromSuccessLevel(21), "success");
  assert.equal(questOutcomeFromSuccessLevel(20), "partial");
  assert.equal(questOutcomeFromSuccessLevel(-20), "partial");
  assert.equal(questOutcomeFromSuccessLevel(-21), "failure");
});

test("rollRandomFactor is deterministic and within [-15, 15]", () => {
  const a = rollRandomFactor("quest:Walter");
  const b = rollRandomFactor("quest:Walter");
  assert.equal(a, b);
  assert.ok(a >= -15 && a <= 15);
});

test("levelFromTotalXp computes level and progress from total XP", () => {
  assert.deepEqual(levelFromTotalXp(0), { level: 1, xpIntoLevel: 0, xpToNextLevel: 100 });
  assert.deepEqual(levelFromTotalXp(99), { level: 1, xpIntoLevel: 99, xpToNextLevel: 100 });
  assert.deepEqual(levelFromTotalXp(100), { level: 2, xpIntoLevel: 0, xpToNextLevel: 125 });
  assert.deepEqual(levelFromTotalXp(224), { level: 2, xpIntoLevel: 124, xpToNextLevel: 125 });
  assert.deepEqual(levelFromTotalXp(225), { level: 3, xpIntoLevel: 0, xpToNextLevel: 156 });
  assert.deepEqual(levelFromTotalXp(576), { level: 5, xpIntoLevel: 0, xpToNextLevel: 244 });
  assert.deepEqual(levelFromTotalXp(620), { level: 5, xpIntoLevel: 44, xpToNextLevel: 244 });
});

test("createRng produces deterministic ints", () => {
  const rng1 = createRng("seed");
  const rng2 = createRng("seed");
  assert.equal(rng1.int(0, 1000), rng2.int(0, 1000));
});
