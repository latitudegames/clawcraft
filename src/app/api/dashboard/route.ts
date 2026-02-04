import { NextResponse } from "next/server";

import { DEV_CONFIG } from "@/config/dev-mode";
import { prisma } from "@/lib/db/prisma";
import { levelFromTotalXp } from "@/lib/game/formulas";
import { questStepAt, scaleDurationMs } from "@/lib/game/timing";
import { resolveQuestRun } from "@/lib/server/resolve-quest-run";
import type { DashboardResponse } from "@/types/api";
import type { ItemDefinition } from "@/types/items";
import type { QuestDefinition, QuestRewards, QuestStatusUpdate } from "@/types/quests";
import type { SkillMultipliers } from "@/types/skills";

export const runtime = "nodejs";

const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const STATUS_INTERVAL_MS = 30 * 60 * 1000;
const STATUS_STEPS = 20;

function cooldownMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(COOLDOWN_MS, DEV_CONFIG.TIME_SCALE) : COOLDOWN_MS;
}

function statusIntervalMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(STATUS_INTERVAL_MS, DEV_CONFIG.TIME_SCALE) : STATUS_INTERVAL_MS;
}

function itemToDefinition(item: { id: string; name: string; description: string; rarity: string; slot: string; skillBonuses: unknown }): ItemDefinition {
  return {
    item_id: item.id,
    name: item.name,
    description: item.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rarity: item.rarity as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slot: item.slot as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skill_bonuses: (item.skillBonuses as any) ?? {}
  };
}

function statusToApi(s: {
  step: number;
  text: string;
  traveling: boolean;
  location: { name: string };
  travelingToward: { name: string } | null;
}): QuestStatusUpdate {
  return {
    step: s.step,
    text: s.text,
    location: s.location.name,
    traveling: s.traveling,
    ...(s.travelingToward ? { traveling_toward: s.travelingToward.name } : {})
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username query param is required." }, { status: 400 });
  }

  const now = new Date();

  let agent = await prisma.agent.findUnique({
    where: { username },
    include: {
      location: true,
      guild: true,
      inventory: { include: { item: true } },
      equipment: { include: { item: true } }
    }
  });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }

  const activeRun = await prisma.questRun.findFirst({
    where: { resolvedAt: null, participants: { some: { agentId: agent.id } } },
    include: {
      quest: { include: { origin: true, destination: true, failDestination: true } },
      statusUpdates: { include: { location: true, travelingToward: true }, orderBy: { step: "asc" } }
    }
  });

  let currentQuest: DashboardResponse["current_quest"] = null;
  if (activeRun) {
    const resolvesAt = new Date(activeRun.startedAt.getTime() + cooldownMs());
    if (now >= resolvesAt) {
      await resolveQuestRun(activeRun.id, now);
      agent = await prisma.agent.findUnique({
        where: { id: agent.id },
        include: {
          location: true,
          guild: true,
          inventory: { include: { item: true } },
          equipment: { include: { item: true } }
        }
      });
    } else {
      const q = activeRun.quest;
      const questDef: QuestDefinition = {
        quest_id: q.id,
        name: q.name,
        description: q.description,
        origin: q.origin.name,
        destination: q.destination.name,
        fail_destination: q.failDestination?.name ?? null,
        nearby_pois_for_journey: (q.nearbyPois as string[] | null) ?? [],
        challenge_rating: q.challengeRating,
        party_size: q.partySize,
        skill_multipliers: q.skillMultipliers as SkillMultipliers,
        rewards: q.rewards as QuestRewards
      };

      currentQuest = {
        quest: questDef,
        started_at: activeRun.startedAt.toISOString(),
        current_step: questStepAt({
          startedAtMs: activeRun.startedAt.getTime(),
          nowMs: now.getTime(),
          stepIntervalMs: statusIntervalMs(),
          totalSteps: STATUS_STEPS
        }),
        statuses: activeRun.statusUpdates.map(statusToApi)
      };
    }
  }

  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_STATE_ERROR", message: "Failed to load agent after resolution." }, { status: 500 });
  }

  const agentCount = await prisma.agent.count({ where: { locationId: agent.locationId } });
  const nearest = await prisma.locationConnection.findMany({
    where: { fromId: agent.locationId },
    include: { to: true },
    orderBy: { distance: "asc" },
    take: 5
  });

  const topPlayers = await prisma.agent.findMany({
    orderBy: [{ level: "desc" }, { xp: "desc" }],
    include: { guild: true },
    take: 3
  });

  const guilds = await prisma.guild.findMany({
    include: { members: { select: { gold: true } } }
  });
  const topGuilds = guilds
    .map((g) => ({ g, total_gold: g.members.reduce((sum, m) => sum + m.gold, 0) }))
    .sort((a, b) => b.total_gold - a.total_gold)
    .slice(0, 3);

  const inventory: ItemDefinition[] = agent.inventory.map((inv) => itemToDefinition(inv.item));
  const equipmentRows = agent.equipment.map((eq) => ({ slot: eq.slot, item: itemToDefinition(eq.item) }));
  const equipment = {
    head: null,
    chest: null,
    legs: null,
    boots: null,
    right_hand: null,
    left_hand: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(Object.fromEntries(equipmentRows.map((r) => [r.slot, r.item])) as any)
  };

  const levelInfo = levelFromTotalXp(agent.xp);
  const nextActionAvailableAt = agent.nextActionAvailableAt && now < agent.nextActionAvailableAt ? agent.nextActionAvailableAt.toISOString() : null;

  const response: DashboardResponse = {
    agent: {
      username: agent.username,
      profile_picture_id: agent.profilePictureId,
      level: levelInfo.level,
      xp: agent.xp,
      xp_to_next_level: levelInfo.xpToNextLevel,
      gold: agent.gold,
      location: agent.location.name,
      guild: agent.guild ? { name: agent.guild.name, tag: agent.guild.tag } : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skills: agent.skills as any,
      unspent_skill_points: agent.unspentSkillPoints,
      equipment,
      inventory
    },
    current_quest: currentQuest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_quest_result: (agent.lastQuestResult as any) ?? null,
    location_info: {
      name: agent.location.name,
      description: agent.location.description,
      agent_count: agentCount,
      nearest_pois: nearest.map((c) => ({ name: c.to.name, type: c.to.type, distance: c.distance }))
    },
    journey_log: ((agent.journeyLog as string[] | null) ?? []).slice(0, 200),
    news: {
      top_players_today: topPlayers.map((p, idx) => ({
        rank: idx + 1,
        username: p.username,
        level: p.level,
        guild_tag: p.guild?.tag ?? null
      })),
      top_guilds_today: topGuilds.map((row, idx) => ({
        rank: idx + 1,
        name: row.g.name,
        tag: row.g.tag,
        total_gold: row.total_gold
      }))
    },
    available_actions: {
      can_quest: !currentQuest && !nextActionAvailableAt,
      can_allocate_skills: agent.unspentSkillPoints > 0,
      can_manage_equipment: true,
      next_action_available_at: nextActionAvailableAt,
      help: "Call GET /api/quests?location=<current location> then POST /api/action to take a quest."
    }
  };

  return NextResponse.json(response);
}
