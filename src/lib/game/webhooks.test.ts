import assert from "node:assert/strict";
import test from "node:test";

import { buildCycleCompleteWebhook, buildPartyFormedWebhook, buildPartyTimeoutWebhook } from "./webhooks";

test("buildCycleCompleteWebhook matches spec shape", () => {
  const payload = buildCycleCompleteWebhook({
    agent: "Walter",
    timestamp: new Date("2024-01-15T12:00:00Z"),
    newLocation: "Goblin Cave",
    questResult: {
      quest_name: "Clear the Goblin Cave",
      outcome: "success",
      xp_gained: 140,
      gold_gained: 120,
      gold_lost: 0,
      items_gained: ["Goblin Dagger"],
      skill_report: {
        skills_used: ["stealth", "lockpicking", "illusion"],
        multipliers_revealed: [1.8, 1.5, 1.6],
        effective_skill: 42.6,
        challenge_rating: 35,
        random_factor: 7,
        success_level: 14.6
      }
    },
    agentState: {
      xp: 620,
      gold: 450,
      location: "Goblin Cave",
      unspentSkillPoints: 5
    },
    availableActions: {
      questsAvailable: 3,
      canManageEquipment: true
    }
  });

  assert.equal(payload.type, "cycle_complete");
  assert.equal(payload.agent, "Walter");
  assert.equal(payload.timestamp, "2024-01-15T12:00:00.000Z");
  assert.equal(payload.quest_result.new_location, "Goblin Cave");
  assert.equal(payload.agent_state.xp_to_next, 244);
  assert.equal(payload.available_actions.quests_available, 3);
  assert.equal(payload.available_actions.can_manage_equipment, true);
});

test("buildPartyFormedWebhook matches spec shape", () => {
  const payload = buildPartyFormedWebhook({
    agent: "Walter",
    questName: "Storm the Dragon's Lair",
    partyMembers: ["Walter", "Alice", "Bob", "Charlie", "Diana"],
    departureTime: new Date("2024-01-15T12:00:00Z")
  });

  assert.deepEqual(payload, {
    type: "party_formed",
    agent: "Walter",
    quest_name: "Storm the Dragon's Lair",
    party_members: ["Walter", "Alice", "Bob", "Charlie", "Diana"],
    departure_time: "2024-01-15T12:00:00.000Z"
  });
});

test("buildPartyTimeoutWebhook matches spec shape", () => {
  const payload = buildPartyTimeoutWebhook({
    agent: "Walter",
    questName: "Storm the Dragon's Lair",
    waitedHours: 24
  });

  assert.deepEqual(payload, {
    type: "party_timeout",
    agent: "Walter",
    quest_name: "Storm the Dragon's Lair",
    waited_hours: 24,
    refunded: true,
    message: "Party failed to form. You may take a new action."
  });
});

