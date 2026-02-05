import type { AgentProfile, LastQuestResult } from "./agents";

export type AgentPublicResponse = {
  ok: true;
  agent: AgentProfile;
  last_quest_result: LastQuestResult | null;
  journey_log: string[];
};

