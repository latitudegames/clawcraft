import { DEV_CONFIG } from "@/config/dev-mode";
import { mockGenerateQuest } from "@/lib/ai/mock-llm";
import { prisma } from "@/lib/db/prisma";
import { buildPartyTimeoutWebhook } from "@/lib/game/webhooks";
import { scaleDurationMs } from "@/lib/game/timing";
import { resolveQuestRun } from "@/lib/server/resolve-quest-run";
import { deliverWebhooks, type WebhookDelivery } from "@/lib/server/webhook-delivery";
import { createRng } from "@/lib/utils/rng";

const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const QUEST_REFRESH_MS = 12 * 60 * 60 * 1000;

function cooldownMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(COOLDOWN_MS, DEV_CONFIG.TIME_SCALE) : COOLDOWN_MS;
}

function questRefreshMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(QUEST_REFRESH_MS, DEV_CONFIG.TIME_SCALE) : QUEST_REFRESH_MS;
}

function questCycleStart(now: Date): Date {
  const intervalMs = questRefreshMs();
  const nowMs = now.getTime();
  const startMs = Math.floor(nowMs / intervalMs) * intervalMs;
  return new Date(startMs);
}

async function resolveDueQuestRuns(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - cooldownMs());
  const due = await prisma.questRun.findMany({
    where: { resolvedAt: null, startedAt: { lte: cutoff } },
    select: { id: true }
  });

  for (const row of due) {
    await resolveQuestRun(row.id, now);
  }

  return due.length;
}

async function timeoutExpiredPartyQueues(now: Date): Promise<{ timedOut: number }> {
  const expired = await prisma.questPartyQueue.findMany({
    where: { status: "waiting", expiresAt: { not: null, lte: now } },
    include: {
      quest: { select: { id: true, name: true, partySize: true } },
      participants: { include: { agent: { select: { id: true, username: true, webhookUrl: true } } } }
    }
  });

  let timedOut = 0;
  const deliveries: WebhookDelivery[] = [];

  for (const q of expired) {
    if (q.participants.length >= q.quest.partySize) continue;

    const participantAgentIds = q.participants.map((p) => p.agentId);
    await prisma.$transaction(async (tx) => {
      if (participantAgentIds.length) {
        await tx.agent.updateMany({
          where: { id: { in: participantAgentIds } },
          data: { nextActionAvailableAt: null }
        });
      }

      await tx.questPartyQueueParticipant.deleteMany({ where: { queueId: q.id } });
      await tx.questPartyQueue.update({
        where: { id: q.id },
        data: { status: "waiting", expiresAt: null }
      });
    });

    timedOut++;

    for (const p of q.participants) {
      const url = p.agent.webhookUrl;
      if (!url) continue;
      deliveries.push({
        url,
        event: buildPartyTimeoutWebhook({ agent: p.agent.username, questName: q.quest.name, waitedHours: 24 })
      });
    }
  }

  await deliverWebhooks(deliveries);
  return { timedOut };
}

async function refreshQuests(now: Date): Promise<{ cycleStart: Date; archived: number; upserted: number }> {
  if (!DEV_CONFIG.DEV_MODE || !DEV_CONFIG.MOCK_LLM) {
    return { cycleStart: questCycleStart(now), archived: 0, upserted: 0 };
  }

  const cycleStart = questCycleStart(now);

  const allLocations = await prisma.location.findMany({
    select: { id: true, name: true, population: true }
  });
  const byName = new Map(allLocations.map((l) => [l.name, l]));

  const connections = await prisma.locationConnection.findMany({
    include: { from: true, to: true }
  });
  const destinationsByFromId = new Map<string, string[]>();
  for (const c of connections) {
    const arr = destinationsByFromId.get(c.fromId) ?? [];
    arr.push(c.to.name);
    destinationsByFromId.set(c.fromId, arr);
  }

  let archived = 0;
  let upserted = 0;

  for (const loc of allLocations) {
    const desired = Math.max(3, Math.floor(loc.population / 10));
    const soloCount = Math.max(1, Math.min(desired, Math.round(desired * 0.75)));

    const destinations = destinationsByFromId.get(loc.id) ?? [];
    const fallbackDestinations = allLocations.filter((l) => l.id !== loc.id).map((l) => l.name);
    const destinationNames = destinations.length >= 2 ? destinations : fallbackDestinations;
    if (destinationNames.length === 0) continue;

    const nearbyPois = Array.from(new Set([loc.name, ...destinationNames])).slice(0, 3);

    const archivedSolo = await prisma.quest.updateMany({
      where: {
        status: "active",
        originId: loc.id,
        partySize: 1,
        createdAt: { lt: cycleStart }
      },
      data: { status: "archived" }
    });
    archived += archivedSolo.count;

    const archivedParty = await prisma.quest.updateMany({
      where: {
        status: "active",
        originId: loc.id,
        partySize: { gt: 1 },
        createdAt: { lt: cycleStart },
        OR: [
          { partyQueue: { is: null } },
          { partyQueue: { is: { participants: { none: {} } } } }
        ]
      },
      data: { status: "archived" }
    });
    archived += archivedParty.count;

    for (let i = 0; i < desired; i++) {
      const seed = `cycle:${cycleStart.toISOString()}:loc:${loc.id}:q:${i}`;
      const partySize = i < soloCount ? 1 : createRng(`${seed}:party`).int(2, 5);
      const quest = mockGenerateQuest({
        origin: loc.name,
        destinations: destinationNames,
        nearbyPois,
        partySize,
        seed
      });

      const dest = byName.get(quest.destination);
      if (!dest) continue;
      const fail = quest.fail_destination ? byName.get(quest.fail_destination) : null;

      await prisma.quest.upsert({
        where: { id: quest.quest_id },
        create: {
          id: quest.quest_id,
          name: quest.name,
          description: quest.description,
          status: "active",
          originId: loc.id,
          destinationId: dest.id,
          failDestinationId: fail?.id ?? null,
          partySize: quest.party_size,
          challengeRating: quest.challenge_rating,
          skillMultipliers: quest.skill_multipliers,
          rewards: quest.rewards,
          nearbyPois: quest.nearby_pois_for_journey,
          createdAt: cycleStart
        },
        update: {
          name: quest.name,
          description: quest.description,
          status: "active",
          destinationId: dest.id,
          failDestinationId: fail?.id ?? null,
          partySize: quest.party_size,
          challengeRating: quest.challenge_rating,
          skillMultipliers: quest.skill_multipliers,
          rewards: quest.rewards,
          nearbyPois: quest.nearby_pois_for_journey
        }
      });
      upserted++;
    }
  }

  return { cycleStart, archived, upserted };
}

export type BackgroundJobsResult = {
  ok: true;
  now: string;
  resolved_runs: number;
  timed_out_party_queues: number;
  quest_refresh: {
    cycle_start: string;
    archived_quests: number;
    upserted_quests: number;
  };
};

export async function runBackgroundJobs(args?: { now?: Date }): Promise<BackgroundJobsResult> {
  const now = args?.now ?? new Date();

  const resolved_runs = await resolveDueQuestRuns(now);
  const { timedOut } = await timeoutExpiredPartyQueues(now);
  const refreshed = await refreshQuests(now);

  return {
    ok: true,
    now: now.toISOString(),
    resolved_runs,
    timed_out_party_queues: timedOut,
    quest_refresh: {
      cycle_start: refreshed.cycleStart.toISOString(),
      archived_quests: refreshed.archived,
      upserted_quests: refreshed.upserted
    }
  };
}

