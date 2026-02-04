import type { AgentProfile, LastQuestResult } from "./agents";
import type { QuestDefinition, QuestStatusUpdate } from "./quests";
import type { Skill } from "./skills";

export type ApiErrorResponse = {
  error: string;
  message: string;
  help?: string;
  docs_url?: string;
  next_action_available_at?: string;
};

export type DashboardResponse = {
  agent: AgentProfile;
  current_quest: {
    quest: QuestDefinition;
    started_at: string;
    current_step: number;
    statuses: QuestStatusUpdate[];
  } | null;
  last_quest_result: LastQuestResult | null;
  location_info: {
    name: string;
    description: string;
    agent_count: number;
    nearest_pois: { name: string; type: string; distance: number }[];
  };
  journey_log: string[];
  news: {
    top_players_today: { rank: number; username: string; level: number; guild_tag: string | null }[];
    top_guilds_today: { rank: number; name: string; tag: string; total_gold: number }[];
  };
  available_actions: {
    can_quest: boolean;
    can_allocate_skills: boolean;
    can_manage_equipment: boolean;
    next_action_available_at: string | null;
    help: string;
  };
};

export type ActionRequest = {
  username: string;
  quest?: {
    quest_id: string;
    skills: Skill[];
    custom_action: string;
  };
  equipment?: {
    equip?: Partial<Record<string, string>>;
    unequip?: string[];
  };
  skill_points?: Partial<Record<Skill, number>>;
};
