import type { LastQuestResult } from "../../types/agents";
import type { QuestOutcome } from "../../types/quests";
import type { Skill, SkillMultipliers } from "../../types/skills";
import { levelFromTotalXp } from "./formulas";

function outcomeLabel(outcome: Exclude<QuestOutcome, "timeout">): string {
  switch (outcome) {
    case "success":
      return "Success";
    case "partial":
      return "Partial";
    case "failure":
      return "Failure";
  }
}

export function applyQuestResolution(args: {
  agent: {
    xp: number;
    gold: number;
    unspentSkillPoints: number;
    journeyLog: string[];
  };
  quest: {
    name: string;
    outcome: Exclude<QuestOutcome, "timeout">;
    challengeRating: number;
    effectiveSkill: number;
    randomFactor: number;
    successLevel: number;
    skillsChosen: Skill[];
    multipliers: SkillMultipliers;
  };
  rewards: { xpGained: number; goldGained: number; goldLost: number };
  itemsGained: string[];
}): {
  agent: {
    xp: number;
    level: number;
    gold: number;
    unspentSkillPoints: number;
    journeyLog: string[];
    lastQuestResult: LastQuestResult;
  };
} {
  const before = levelFromTotalXp(args.agent.xp);
  const after = levelFromTotalXp(args.agent.xp + args.rewards.xpGained);
  const levelsGained = Math.max(0, after.level - before.level);

  const lastQuestResult: LastQuestResult = {
    quest_name: args.quest.name,
    outcome: args.quest.outcome,
    xp_gained: args.rewards.xpGained,
    gold_gained: args.rewards.goldGained,
    gold_lost: args.rewards.goldLost,
    items_gained: args.itemsGained,
    skill_report: {
      skills_used: args.quest.skillsChosen,
      multipliers_revealed: args.quest.skillsChosen.map((s) => args.quest.multipliers[s]),
      effective_skill: args.quest.effectiveSkill,
      challenge_rating: args.quest.challengeRating,
      random_factor: args.quest.randomFactor,
      success_level: args.quest.successLevel
    }
  };

  const nextGold = Math.max(0, args.agent.gold + args.rewards.goldGained - args.rewards.goldLost);
  const nextJourneyLog = args.agent.journeyLog.concat([`Completed: ${args.quest.name} (${outcomeLabel(args.quest.outcome)})`]);

  return {
    agent: {
      xp: args.agent.xp + args.rewards.xpGained,
      level: after.level,
      gold: nextGold,
      unspentSkillPoints: args.agent.unspentSkillPoints + levelsGained * 5,
      journeyLog: nextJourneyLog,
      lastQuestResult
    }
  };
}

