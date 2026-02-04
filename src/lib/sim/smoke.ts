/* eslint-disable no-console */

import type { QuestStatusUpdate } from "../../types/quests";
import type { SkillValues } from "../../types/skills";
import { mockGenerateQuest, mockGenerateStatusUpdates } from "../ai/mock-llm";
import { parseSkillValues, validateCreateCharacterSkillAllocation } from "../game/character";
import { applyQuestResolution } from "../game/quest-effects";
import { computeQuestResult } from "../game/quest-resolution";
import { partyChallengeRating } from "../game/formulas";

export type SmokeResult = {
  seed: string;
  quest_id: string;
  outcome: "success" | "partial" | "failure";
  statuses: QuestStatusUpdate[];
  agent_after: {
    level: number;
    xp: number;
    gold: number;
    unspent_skill_points: number;
    journey_log: string[];
  };
};

function buildBaseSkills(): SkillValues {
  const skills = parseSkillValues({ stealth: 10, lockpicking: 6, illusion: 4 });
  validateCreateCharacterSkillAllocation(skills);
  return skills;
}

export function runSmokeSimulation(input?: { seed?: string }): SmokeResult {
  const seed = String(input?.seed ?? "seed");

  const baseSkills = buildBaseSkills();
  const origin = "King's Landing";
  const destinations = ["Goblin Cave", "Whispering Woods", "Ancient Library", "Dragon Peak"];
  const nearbyPois = [origin, "Goblin Cave", "Whispering Woods"];

  const quest = mockGenerateQuest({
    origin,
    destinations,
    nearbyPois,
    partySize: 1,
    challengeRating: 35,
    seed: `${seed}:quest`
  });

  const skillsChosen: ["stealth", "lockpicking", "illusion"] = ["stealth", "lockpicking", "illusion"];

  const result = computeQuestResult({
    partySize: quest.party_size,
    baseChallengeRating: quest.challenge_rating,
    rewards: quest.rewards,
    skillsChosen,
    baseSkills,
    multipliers: quest.skill_multipliers,
    seed: `${seed}:roll`,
    agentGold: 100
  });

  const statuses = mockGenerateStatusUpdates({
    quest,
    agent: {
      username: "codex_smoke",
      skills_chosen: skillsChosen,
      custom_action: "Move quietly, create an illusion as a decoy, and pick locks without a sound."
    },
    outcome: result.outcome,
    seed: `${seed}:status`
  });

  const challengeUsed = partyChallengeRating(quest.challenge_rating, quest.party_size);
  const applied = applyQuestResolution({
    agent: {
      xp: 0,
      gold: 100,
      unspentSkillPoints: 0,
      journeyLog: [`Started adventure at ${origin}.`]
    },
    quest: {
      name: quest.name,
      outcome: result.outcome,
      challengeRating: challengeUsed,
      effectiveSkill: result.effectiveSkill,
      randomFactor: result.randomFactor,
      successLevel: result.successLevel,
      skillsChosen,
      multipliers: quest.skill_multipliers
    },
    rewards: { xpGained: result.xpGained, goldGained: result.goldGained, goldLost: result.goldLost },
    itemsGained: []
  });

  return {
    seed,
    quest_id: quest.quest_id,
    outcome: result.outcome,
    statuses,
    agent_after: {
      level: applied.agent.level,
      xp: applied.agent.xp,
      gold: applied.agent.gold,
      unspent_skill_points: applied.agent.unspentSkillPoints,
      journey_log: applied.agent.journeyLog
    }
  };
}

// Allow running via `node .tmp/node-tests/lib/sim/smoke.js` after compilation.
// (This file is also imported by tests.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMain = typeof require !== "undefined" && (require as any).main === module;
if (isMain) {
  const out = runSmokeSimulation({ seed: process.env.SIM_SEED ?? "seed" });
  console.log(JSON.stringify(out, null, 2));
}
