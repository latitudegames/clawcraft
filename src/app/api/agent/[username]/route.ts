import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { levelFromTotalXp } from "@/lib/game/formulas";
import type { AgentProfile } from "@/types/agents";
import type { ItemDefinition } from "@/types/items";

export const runtime = "nodejs";

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
  const agent = await prisma.agent.findUnique({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_quest_result: (agent.lastQuestResult as any) ?? null,
    journey_log: ((agent.journeyLog as string[] | null) ?? []).slice(0, 200)
  });
}
