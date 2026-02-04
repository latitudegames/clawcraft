import { createRng } from "../utils/rng";
import type { QuestOutcome } from "../../types/quests";
import type { Skill, SkillBonuses, SkillMultipliers, SkillValues } from "../../types/skills";

export function xpRequiredForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error("level must be an integer >= 1");
  return Math.floor(100 * Math.pow(1.25, level - 1));
}

export function partyXpMultiplier(partySize: number): number {
  switch (partySize) {
    case 1:
      return 1;
    case 2:
      return 1.25;
    case 3:
      return 1.5;
    case 4:
      return 1.75;
    case 5:
      return 2.0;
    default:
      throw new Error("partySize must be between 1 and 5");
  }
}

export function partyChallengeRating(baseChallengeRating: number, partySize: number): number {
  if (!Number.isFinite(baseChallengeRating) || baseChallengeRating < 0) throw new Error("baseChallengeRating must be >= 0");
  return baseChallengeRating * partySize;
}

export function effectiveSkill(args: {
  skillsChosen: readonly Skill[];
  baseSkills: SkillValues;
  multipliers: SkillMultipliers;
  equipmentBonuses?: SkillBonuses;
}): number {
  if (args.skillsChosen.length !== 3) throw new Error("skillsChosen must have exactly 3 skills");

  const { skillsChosen, baseSkills, multipliers, equipmentBonuses } = args;

  let total = 0;
  for (const skill of skillsChosen) {
    const base = baseSkills[skill];
    const bonus = equipmentBonuses?.[skill] ?? 0;
    const multiplier = multipliers[skill];
    total += (base + bonus) * multiplier;
  }
  return total;
}

export function rollRandomFactor(seed: string | number): number {
  // Design doc: Random(-15, +15)
  const rng = createRng(seed);
  return rng.int(-15, 15);
}

export function successLevel(args: { effectiveSkill: number; challengeRating: number; randomFactor: number }): number {
  const { effectiveSkill, challengeRating, randomFactor } = args;
  if (!Number.isFinite(effectiveSkill)) throw new Error("effectiveSkill must be finite");
  if (!Number.isFinite(challengeRating)) throw new Error("challengeRating must be finite");
  if (!Number.isFinite(randomFactor)) throw new Error("randomFactor must be finite");
  return effectiveSkill - challengeRating + randomFactor;
}

export function questOutcomeFromSuccessLevel(level: number): Exclude<QuestOutcome, "timeout"> {
  if (level > 20) return "success";
  if (level < -20) return "failure";
  return "partial";
}

export function levelFromTotalXp(totalXp: number): { level: number; xpIntoLevel: number; xpToNextLevel: number } {
  if (!Number.isInteger(totalXp) || totalXp < 0) throw new Error("totalXp must be an integer >= 0");

  let level = 1;
  let remaining = totalXp;

  // Iterate until remaining XP can't pay the next level cost.
  // Leveling costs follow xpRequiredForLevel(level) for level->level+1.
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level++;
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpToNextLevel: xpRequiredForLevel(level)
  };
}
