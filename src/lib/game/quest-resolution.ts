import type { QuestRewards } from "../../types/quests";
import type { Skill, SkillBonuses, SkillMultipliers, SkillValues } from "../../types/skills";
import { effectiveSkill, partyChallengeRating, partyXpMultiplier, questOutcomeFromSuccessLevel, rollRandomFactor, successLevel } from "./formulas";

export function computeQuestResult(args: {
  partySize: number;
  baseChallengeRating: number;
  rewards: QuestRewards;
  skillsChosen: readonly Skill[];
  baseSkills: SkillValues;
  multipliers: SkillMultipliers;
  equipmentBonuses?: SkillBonuses;
  seed: string | number;
  agentGold?: number;
}): {
  effectiveSkill: number;
  randomFactor: number;
  successLevel: number;
  outcome: "success" | "partial" | "failure";
  xpGained: number;
  goldGained: number;
  goldLost: number;
} {
  const challengeRating = partyChallengeRating(args.baseChallengeRating, args.partySize);
  const effective = effectiveSkill({
    skillsChosen: args.skillsChosen,
    baseSkills: args.baseSkills,
    multipliers: args.multipliers,
    equipmentBonuses: args.equipmentBonuses
  });

  const randomFactor = rollRandomFactor(args.seed);
  const level = successLevel({ effectiveSkill: effective, challengeRating, randomFactor });
  const outcome = questOutcomeFromSuccessLevel(level);

  const baseReward = outcome === "success" ? args.rewards.success : outcome === "partial" ? args.rewards.partial : { xp: 0, gold: 0 };

  const xpGained = Math.round(baseReward.xp * partyXpMultiplier(args.partySize));
  const goldGained = baseReward.gold;
  const goldLost = outcome === "failure" ? Math.floor((args.agentGold ?? 0) * 0.1) : 0;

  return {
    effectiveSkill: effective,
    randomFactor,
    successLevel: level,
    outcome,
    xpGained,
    goldGained,
    goldLost
  };
}

export function computePartyQuestResult(args: {
  partySize: number;
  baseChallengeRating: number;
  rewards: QuestRewards;
  multipliers: SkillMultipliers;
  participants: Array<{
    skillsChosen: readonly Skill[];
    baseSkills: SkillValues;
    equipmentBonuses?: SkillBonuses;
    agentGold?: number;
  }>;
  seed: string | number;
}): {
  effectiveSkill: number;
  randomFactor: number;
  successLevel: number;
  outcome: "success" | "partial" | "failure";
  participants: Array<{
    contributedEffectiveSkill: number;
    xpGained: number;
    goldGained: number;
    goldLost: number;
  }>;
} {
  if (!Number.isInteger(args.partySize) || args.partySize < 1 || args.partySize > 5) {
    throw new Error("partySize must be an integer between 1 and 5");
  }
  if (args.participants.length !== args.partySize) {
    throw new Error(`participants length (${args.participants.length}) must match partySize (${args.partySize})`);
  }

  const contributions = args.participants.map((p) =>
    effectiveSkill({
      skillsChosen: p.skillsChosen,
      baseSkills: p.baseSkills,
      multipliers: args.multipliers,
      equipmentBonuses: p.equipmentBonuses
    })
  );

  const partyEffectiveSkill = contributions.reduce((sum, v) => sum + v, 0);
  const challengeRating = partyChallengeRating(args.baseChallengeRating, args.partySize);
  const randomFactor = rollRandomFactor(args.seed);
  const level = successLevel({ effectiveSkill: partyEffectiveSkill, challengeRating, randomFactor });
  const outcome = questOutcomeFromSuccessLevel(level);

  const baseReward = outcome === "success" ? args.rewards.success : outcome === "partial" ? args.rewards.partial : { xp: 0, gold: 0 };
  const xpGained = Math.round(baseReward.xp * partyXpMultiplier(args.partySize));
  const goldGained = baseReward.gold;

  return {
    effectiveSkill: partyEffectiveSkill,
    randomFactor,
    successLevel: level,
    outcome,
    participants: contributions.map((contributedEffectiveSkill, idx) => {
      const agentGold = args.participants[idx]?.agentGold ?? 0;
      return {
        contributedEffectiveSkill,
        xpGained,
        goldGained,
        goldLost: outcome === "failure" ? Math.floor(agentGold * 0.1) : 0
      };
    })
  };
}
