import type { Skill, SkillMultipliers } from "./skills";

export type QuestOutcome = "success" | "partial" | "failure" | "timeout";

export type QuestReward = {
  xp: number;
  gold: number;
};

export type QuestRewards = {
  success: QuestReward;
  partial: QuestReward;
};

export type QuestDefinition = {
  quest_id: string;
  name: string;
  description: string;
  origin: string;
  destination: string;
  fail_destination: string | null;
  nearby_pois_for_journey: string[];
  challenge_rating: number;
  party_size: number;
  skill_multipliers: SkillMultipliers;
  rewards: QuestRewards;
};

export type QuestStatusUpdate = {
  step: number; // 1..20
  text: string;
  location: string;
  traveling: boolean;
  traveling_toward?: string;
};

export type QuestSkillReport = {
  skills_used: Skill[];
  multipliers_revealed: number[];
  effective_skill: number;
  challenge_rating: number;
  random_factor: number;
  success_level: number;
};
