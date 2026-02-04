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

