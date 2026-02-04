import assert from "node:assert/strict";
import test from "node:test";

import { applyQuestResolution } from "./quest-effects";
import { SKILLS, type SkillMultipliers } from "../../types/skills";

function makeMultipliers(overrides: Partial<SkillMultipliers>): SkillMultipliers {
  const out = {} as SkillMultipliers;
  for (const skill of SKILLS) out[skill] = overrides[skill] ?? 0;
  return out;
}

test("applyQuestResolution updates xp/level/gold and appends journey log", () => {
  const multipliers = makeMultipliers({ stealth: 1.8, lockpicking: 1.5, illusion: 1.5 });

  const out = applyQuestResolution({
    agent: {
      xp: 0,
      gold: 100,
      unspentSkillPoints: 0,
      journeyLog: ["Started adventure at King's Landing."]
    },
    quest: {
      name: "Clear the Goblin Cave",
      outcome: "success",
      challengeRating: 35,
      effectiveSkill: 42.6,
      randomFactor: 7,
      successLevel: 14.6,
      skillsChosen: ["stealth", "lockpicking", "illusion"],
      multipliers
    },
    rewards: { xpGained: 100, goldGained: 50, goldLost: 0 },
    itemsGained: []
  });

  assert.equal(out.agent.xp, 100);
  assert.equal(out.agent.level, 2);
  assert.equal(out.agent.unspentSkillPoints, 5);
  assert.equal(out.agent.gold, 150);
  assert.equal(out.agent.journeyLog.at(-1), "Completed: Clear the Goblin Cave (Success)");

  assert.deepEqual(out.agent.lastQuestResult, {
    quest_name: "Clear the Goblin Cave",
    outcome: "success",
    xp_gained: 100,
    gold_gained: 50,
    gold_lost: 0,
    items_gained: [],
    skill_report: {
      skills_used: ["stealth", "lockpicking", "illusion"],
      multipliers_revealed: [1.8, 1.5, 1.5],
      effective_skill: 42.6,
      challenge_rating: 35,
      random_factor: 7,
      success_level: 14.6
    }
  });
});

