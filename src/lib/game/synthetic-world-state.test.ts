import assert from "node:assert/strict";
import test from "node:test";

import type { WorldStateResponse } from "../../types/world-state";
import { withSyntheticAgents } from "./synthetic-world-state";

function baseState(): WorldStateResponse {
  return {
    server_time: "2026-02-06T00:00:00.000Z",
    locations: [
      { id: "loc_a", name: "King's Landing", type: "major_city", biome_tag: "plains", x: 0, y: 0 },
      { id: "loc_b", name: "Goblin Cave", type: "dungeon", biome_tag: "cave", x: 200, y: 0 }
    ],
    connections: [{ from_id: "loc_a", to_id: "loc_b", distance: 2 }],
    agents: [
      {
        username: "real_agent",
        guild_tag: null,
        run_id: null,
        level: 1,
        location: "King's Landing",
        x: 0,
        y: 0,
        traveling: false,
        status: null
      }
    ]
  };
}

test("withSyntheticAgents does not mutate the base state", () => {
  const base = baseState();
  const next = withSyntheticAgents(base, { count: 5, seed: "abc", statusRate: 1, partyRate: 0 });

  assert.equal(base.agents.length, 1);
  assert.equal(next.agents.length, 6);
});

test("withSyntheticAgents supports only=true (replaces agents)", () => {
  const base = baseState();
  const next = withSyntheticAgents(base, { count: 7, seed: "abc", statusRate: 0, partyRate: 0, only: true });

  assert.equal(base.agents.length, 1);
  assert.equal(next.agents.length, 7);
  assert.ok(next.agents.every((a) => a.username.startsWith("synth_")));
});

test("withSyntheticAgents is deterministic for a given seed", () => {
  const base = baseState();
  const a = withSyntheticAgents(base, { count: 12, seed: "deterministic", statusRate: 0.6, partyRate: 0.3, only: true });
  const b = withSyntheticAgents(base, { count: 12, seed: "deterministic", statusRate: 0.6, partyRate: 0.3, only: true });

  assert.deepEqual(a.agents, b.agents);
});

test("withSyntheticAgents respects statusRate=1 (all synthetic agents get a status)", () => {
  const base = baseState();
  const next = withSyntheticAgents(base, { count: 20, seed: "all-status", statusRate: 1, partyRate: 0, only: true });

  assert.equal(next.agents.length, 20);
  assert.ok(next.agents.every((a) => a.status !== null));
});

test("withSyntheticAgents creates party clusters when partyRate is high", () => {
  const base = baseState();
  const next = withSyntheticAgents(base, { count: 20, seed: "party", statusRate: 0, partyRate: 1, only: true });

  const byRun = new Map<string, number>();
  for (const a of next.agents) {
    if (!a.run_id) continue;
    byRun.set(a.run_id, (byRun.get(a.run_id) ?? 0) + 1);
  }

  const hasParty = Array.from(byRun.values()).some((n) => n > 1);
  assert.ok(hasParty);
});

