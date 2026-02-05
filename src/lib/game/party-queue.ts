import type { Skill } from "../../types/skills";

export type PartyQueueStatus = "waiting" | "formed" | "timed_out";

export type PartyQueueParticipant = {
  agentId: string;
  joinedAtMs: number;
  skillsChosen: readonly Skill[];
  customAction: string;
};

export type PartyQueue = {
  status: PartyQueueStatus;
  expiresAtMs: number | null;
  participants: PartyQueueParticipant[];
};

export type PartyQueueEvent =
  | { type: "formed"; agentIds: string[] }
  | { type: "timed_out"; refundedAgentIds: string[] };

export function joinPartyQueue(args: {
  queue: PartyQueue;
  partySize: number;
  timeoutMs: number;
  participant: PartyQueueParticipant;
}): { queue: PartyQueue; event?: PartyQueueEvent } {
  if (args.queue.status !== "waiting") {
    throw new Error(`Queue is not accepting participants (status=${args.queue.status})`);
  }
  if (!Number.isInteger(args.partySize) || args.partySize < 1 || args.partySize > 5) {
    throw new Error("partySize must be an integer between 1 and 5");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("timeoutMs must be a finite number > 0");
  }

  const p = args.participant;
  if (!p.agentId) throw new Error("participant.agentId is required");
  if (!Number.isFinite(p.joinedAtMs) || p.joinedAtMs < 0) throw new Error("participant.joinedAtMs must be a finite number >= 0");
  if (!p.customAction.trim()) throw new Error("participant.customAction is required");
  if (p.skillsChosen.length !== 3) throw new Error("participant.skillsChosen must have exactly 3 skills");

  if (args.queue.participants.some((existing) => existing.agentId === p.agentId)) {
    throw new Error(`Agent already queued: ${p.agentId}`);
  }

  const expiresAtMs = args.queue.expiresAtMs ?? p.joinedAtMs + args.timeoutMs;
  const participants = args.queue.participants.concat([p]);

  if (participants.length === args.partySize) {
    return {
      queue: {
        status: "formed",
        expiresAtMs,
        participants
      },
      event: { type: "formed", agentIds: participants.map((x) => x.agentId) }
    };
  }

  return {
    queue: {
      status: "waiting",
      expiresAtMs,
      participants
    }
  };
}

export function tickPartyQueue(args: {
  queue: PartyQueue;
  nowMs: number;
  partySize: number;
}): { queue: PartyQueue; event?: PartyQueueEvent } {
  if (args.queue.status !== "waiting") return { queue: args.queue };
  if (!Number.isInteger(args.partySize) || args.partySize < 1 || args.partySize > 5) {
    throw new Error("partySize must be an integer between 1 and 5");
  }
  if (!Number.isFinite(args.nowMs) || args.nowMs < 0) throw new Error("nowMs must be a finite number >= 0");
  if (args.queue.expiresAtMs === null) return { queue: args.queue };
  if (args.nowMs <= args.queue.expiresAtMs) return { queue: args.queue };

  if (args.queue.participants.length >= args.partySize) {
    return {
      queue: { ...args.queue, status: "formed" },
      event: { type: "formed", agentIds: args.queue.participants.map((x) => x.agentId) }
    };
  }

  return {
    queue: { ...args.queue, status: "timed_out" },
    event: { type: "timed_out", refundedAgentIds: args.queue.participants.map((x) => x.agentId) }
  };
}

