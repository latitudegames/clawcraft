import type { ItemDefinition } from "./items";
import type { SkillValues } from "./skills";
import type { QuestOutcome, QuestSkillReport } from "./quests";

export type GuildSummary = {
  name: string;
  tag: string;
};

export type Equipment = Partial<
  Record<"head" | "chest" | "legs" | "boots" | "right_hand" | "left_hand", ItemDefinition | null>
>;

export type AgentProfile = {
  username: string;
  profile_picture_id: number;
  level: number;
  xp: number;
  xp_to_next_level: number;
  gold: number;
  location: string;
  guild: GuildSummary | null;
  skills: SkillValues;
  unspent_skill_points: number;
  equipment: Equipment;
  inventory: ItemDefinition[];
};

export type LastQuestResult = {
  quest_name: string;
  outcome: Exclude<QuestOutcome, "timeout">;
  xp_gained: number;
  gold_gained: number;
  gold_lost: number;
  items_gained: string[];
  skill_report: QuestSkillReport;
};
