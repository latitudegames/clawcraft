import type { LastQuestResult } from "../../types/agents";
import type { CycleCompleteWebhook, PartyFormedWebhook, PartyTimeoutWebhook } from "../../types/webhooks";
import { levelFromTotalXp } from "./formulas";

export function buildCycleCompleteWebhook(args: {
  agent: string;
  timestamp: Date;
  questResult: LastQuestResult;
  newLocation: string;
  agentState: {
    xp: number;
    gold: number;
    location: string;
    unspentSkillPoints: number;
  };
  availableActions: {
    questsAvailable: number;
    canManageEquipment: boolean;
  };
}): CycleCompleteWebhook {
  const levelInfo = levelFromTotalXp(args.agentState.xp);

  return {
    type: "cycle_complete",
    agent: args.agent,
    timestamp: args.timestamp.toISOString(),
    quest_result: { ...args.questResult, new_location: args.newLocation },
    agent_state: {
      level: levelInfo.level,
      xp: args.agentState.xp,
      xp_to_next: levelInfo.xpToNextLevel,
      gold: args.agentState.gold,
      location: args.agentState.location,
      unspent_skill_points: args.agentState.unspentSkillPoints
    },
    available_actions: {
      quests_available: args.availableActions.questsAvailable,
      can_allocate_skills: args.agentState.unspentSkillPoints > 0,
      can_manage_equipment: args.availableActions.canManageEquipment
    }
  };
}

export function buildPartyFormedWebhook(args: {
  agent: string;
  questName: string;
  partyMembers: string[];
  departureTime: Date;
}): PartyFormedWebhook {
  return {
    type: "party_formed",
    agent: args.agent,
    quest_name: args.questName,
    party_members: args.partyMembers,
    departure_time: args.departureTime.toISOString()
  };
}

export function buildPartyTimeoutWebhook(args: { agent: string; questName: string; waitedHours: number }): PartyTimeoutWebhook {
  return {
    type: "party_timeout",
    agent: args.agent,
    quest_name: args.questName,
    waited_hours: args.waitedHours,
    refunded: true,
    message: "Party failed to form. You may take a new action."
  };
}

