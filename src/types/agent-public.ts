import type { AgentProfile, LastQuestResult } from "./agents";

export type AgentPublicCurrentQuest = {
  run_id: string;
  quest_id: string;
  quest_name: string;
  origin: string;
  destination: string;
  started_at: string;
  current_step: number;
  total_steps: number;
  status_text: string | null;
};

export type AgentPublicResponse = {
  ok: true;
  agent: AgentProfile;
  current_quest: AgentPublicCurrentQuest | null;
  last_quest_result: LastQuestResult | null;
  journey_log: string[];
};
