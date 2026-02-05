import { NextResponse } from "next/server";

import { DEV_CONFIG } from "@/config/dev-mode";
import { prisma } from "@/lib/db/prisma";
import { levelFromTotalXp } from "@/lib/game/formulas";
import { questProgressAt } from "@/lib/game/quest-progress";
import { scaleDurationMs } from "@/lib/game/timing";
import { resolveQuestRun } from "@/lib/server/resolve-quest-run";
import type { AgentProfile } from "@/types/agents";
import type { AgentPublicCurrentQuest } from "@/types/agent-public";
import type { ItemDefinition } from "@/types/items";

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

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
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
      quest: { include: { origin: { select: { name: true } }, destination: { select: { name: true } } } },
      statusUpdates: { select: { step: true, text: true }, orderBy: { step: "asc" } }
    }
  });

  let currentQuest: AgentPublicCurrentQuest | null = null;
  if (activeRun) {
    const resolvesAt = new Date(activeRun.startedAt.getTime() + cooldownMs());
    if (now >= resolvesAt) {
      await resolveQuestRun(activeRun.id, now);
      agent = await prisma.agent.findUnique({
        where: { username },
        include: {
          location: true,
          guild: true,
          inventory: { include: { item: true } },
          equipment: { include: { item: true } }
        }
      });
    } else {
      const progress = questProgressAt({
        startedAtMs: activeRun.startedAt.getTime(),
        nowMs: now.getTime(),
        stepIntervalMs: statusIntervalMs(),
        totalSteps: STATUS_STEPS,
        statuses: activeRun.statusUpdates
      });

      currentQuest = {
        run_id: activeRun.id,
        quest_id: activeRun.quest.id,
        quest_name: activeRun.quest.name,
        origin: activeRun.quest.origin.name,
        destination: activeRun.quest.destination.name,
        started_at: activeRun.startedAt.toISOString(),
        current_step: progress.currentStep,
        total_steps: progress.totalSteps,
        status_text: progress.statusText
      };
    }
  }

  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_STATE_ERROR", message: "Failed to load agent after resolution." }, { status: 500 });
  }

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

  const profile: AgentProfile = {
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
  };

  return NextResponse.json({
    ok: true,
    agent: profile,
    current_quest: currentQuest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_quest_result: (agent.lastQuestResult as any) ?? null,
    journey_log: ((agent.journeyLog as string[] | null) ?? []).slice(0, 200)
  });
}
