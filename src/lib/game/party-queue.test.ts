import assert from "node:assert/strict";
import test from "node:test";

import { joinPartyQueue, tickPartyQueue, type PartyQueue } from "./party-queue";

function emptyQueue(): PartyQueue {
  return { status: "waiting", expiresAtMs: null, participants: [] };
}

test("joinPartyQueue sets expiresAtMs on first join and does not extend it", () => {
  const timeoutMs = 24 * 60 * 60 * 1000;
  const joinedAtMs = 1_000;

  const first = joinPartyQueue({
    queue: emptyQueue(),
    partySize: 2,
    timeoutMs,
    participant: { agentId: "a1", joinedAtMs, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "Go." }
  });

  assert.equal(first.queue.expiresAtMs, joinedAtMs + timeoutMs);

  const second = joinPartyQueue({
    queue: first.queue,
    partySize: 3,
    timeoutMs,
    participant: { agentId: "a2", joinedAtMs: joinedAtMs + 123, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "Go." }
  });

  assert.equal(second.queue.expiresAtMs, joinedAtMs + timeoutMs);
});

test("joinPartyQueue forms the party when it reaches partySize", () => {
  const timeoutMs = 24 * 60 * 60 * 1000;
  const q1 = joinPartyQueue({
    queue: emptyQueue(),
    partySize: 2,
    timeoutMs,
    participant: { agentId: "a1", joinedAtMs: 0, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A1" }
  });

  const q2 = joinPartyQueue({
    queue: q1.queue,
    partySize: 2,
    timeoutMs,
    participant: { agentId: "a2", joinedAtMs: 1, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A2" }
  });

  assert.equal(q2.queue.status, "formed");
  assert.deepEqual(q2.event, { type: "formed", agentIds: ["a1", "a2"] });
});

test("tickPartyQueue times out and refunds queued agents after expiresAtMs", () => {
  const timeoutMs = 24 * 60 * 60 * 1000;
  const q1 = joinPartyQueue({
    queue: emptyQueue(),
    partySize: 3,
    timeoutMs,
    participant: { agentId: "a1", joinedAtMs: 10, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A1" }
  });

  const q2 = joinPartyQueue({
    queue: q1.queue,
    partySize: 3,
    timeoutMs,
    participant: { agentId: "a2", joinedAtMs: 20, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A2" }
  });

  const ticked = tickPartyQueue({
    queue: q2.queue,
    nowMs: (q2.queue.expiresAtMs ?? 0) + 1,
    partySize: 3
  });

  assert.equal(ticked.queue.status, "timed_out");
  assert.deepEqual(ticked.event, { type: "timed_out", refundedAgentIds: ["a1", "a2"] });
});

test("joinPartyQueue rejects duplicate agent entries", () => {
  const timeoutMs = 24 * 60 * 60 * 1000;
  const q1 = joinPartyQueue({
    queue: emptyQueue(),
    partySize: 3,
    timeoutMs,
    participant: { agentId: "a1", joinedAtMs: 0, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A1" }
  });

  assert.throws(() => {
    joinPartyQueue({
      queue: q1.queue,
      partySize: 3,
      timeoutMs,
      participant: { agentId: "a1", joinedAtMs: 1, skillsChosen: ["stealth", "lockpicking", "illusion"], customAction: "A1 again" }
    });
  });
});

