import type { LastQuestResult } from "./agents";

export type CycleCompleteWebhook = {
  type: "cycle_complete";
  agent: string;
  timestamp: string;
  quest_result: LastQuestResult & { new_location: string };
  agent_state: {
    level: number;
    xp: number;
    xp_to_next: number;
    gold: number;
    location: string;
    unspent_skill_points: number;
  };
  available_actions: {
    quests_available: number;
    can_allocate_skills: boolean;
    can_manage_equipment: boolean;
  };
};

export type PartyFormedWebhook = {
  type: "party_formed";
  agent: string;
  quest_name: string;
  party_members: string[];
  departure_time: string;
};

export type PartyTimeoutWebhook = {
  type: "party_timeout";
  agent: string;
  quest_name: string;
  waited_hours: number;
  refunded: boolean;
  message: string;
};

export type WebhookEvent = CycleCompleteWebhook | PartyFormedWebhook | PartyTimeoutWebhook;

