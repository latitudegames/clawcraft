import { NextResponse } from "next/server";

import { DEV_CONFIG } from "@/config/dev-mode";
import { mockGenerateStatusUpdates } from "@/lib/ai/mock-llm";
import { prisma } from "@/lib/db/prisma";
import { parseSkillValues } from "@/lib/game/character";
import { applyEquipmentChanges, getEquipmentSkillBonuses } from "@/lib/game/equipment";
import { computeQuestResult } from "@/lib/game/quest-resolution";
import { scaleDurationMs, questStepAt } from "@/lib/game/timing";
import { resolveQuestRun } from "@/lib/server/resolve-quest-run";
import { EQUIPMENT_SLOTS, type EquipmentSlot, type ItemDefinition } from "@/types/items";
import { isSkill, type Skill, type SkillMultipliers } from "@/types/skills";
import type { QuestDefinition, QuestRewards } from "@/types/quests";

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

function isEquipmentSlot(value: string): value is EquipmentSlot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (EQUIPMENT_SLOTS as readonly any[]).includes(value);
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

export async function POST(request: Request) {
  const now = new Date();
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY", message: "Body must be a JSON object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  if (!username) {
    return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });
  }

  let agent = await prisma.agent.findUnique({
    where: { username },
    include: {
      location: true,
      inventory: { include: { item: true } },
      equipment: { include: { item: true } }
    }
  });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }

  const active = await prisma.questRunParticipant.findFirst({
    where: { agentId: agent.id, run: { resolvedAt: null } },
    include: { run: true }
  });

  if (active) {
    const resolvesAt = new Date(active.run.startedAt.getTime() + cooldownMs());
    if (now >= resolvesAt) {
      await resolveQuestRun(active.runId, now);
      agent = await prisma.agent.findUnique({
        where: { id: agent.id },
        include: {
          location: true,
          inventory: { include: { item: true } },
          equipment: { include: { item: true } }
        }
      });
    } else {
      const currentStep = questStepAt({
        startedAtMs: active.run.startedAt.getTime(),
        nowMs: now.getTime(),
        stepIntervalMs: statusIntervalMs(),
        totalSteps: STATUS_STEPS
      });
      return NextResponse.json(
        {
          ok: false,
          error: "ACTION_ON_COOLDOWN",
          message: "You cannot take another action yet.",
          next_action_available_at: resolvesAt.toISOString(),
          current_step: currentStep,
          help: "Call GET /api/dashboard?username=... to see current quest status."
        },
        { status: 409 }
      );
    }
  }

  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_STATE_ERROR", message: "Failed to load agent after resolution." }, { status: 500 });
  }

  // Skill point allocation (optional; allowed even if no quest is taken).
  if (raw.skill_points && typeof raw.skill_points === "object" && !Array.isArray(raw.skill_points)) {
    const spending = raw.skill_points as Record<string, unknown>;
    let totalSpend = 0;
    const increments: Record<Skill, number> = {} as Record<Skill, number>;
    for (const [k, v] of Object.entries(spending)) {
      if (!isSkill(k)) {
        return NextResponse.json({ ok: false, error: "INVALID_SKILL", message: `Unknown skill: ${k}` }, { status: 400 });
      }
      if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) {
        return NextResponse.json({ ok: false, error: "INVALID_SKILL_POINTS", message: `skill_points.${k} must be an integer > 0` }, { status: 400 });
      }
      totalSpend += v;
      increments[k] = (increments[k] ?? 0) + v;
    }

    if (totalSpend > agent.unspentSkillPoints) {
      return NextResponse.json(
        {
          ok: false,
          error: "INSUFFICIENT_SKILL_POINTS",
          message: "Not enough unspent skill points.",
          available: agent.unspentSkillPoints,
          requested: totalSpend
        },
        { status: 400 }
      );
    }

    const currentSkills = parseSkillValues(agent.skills);
    for (const [skill, inc] of Object.entries(increments) as [Skill, number][]) {
      currentSkills[skill] += inc;
    }

    agent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        skills: currentSkills,
        unspentSkillPoints: agent.unspentSkillPoints - totalSpend
      },
      include: {
        location: true,
        inventory: { include: { item: true } },
        equipment: { include: { item: true } }
      }
    });
  }

  // Equipment management (optional; allowed even if no quest is taken).
  if (raw.equipment && typeof raw.equipment === "object" && !Array.isArray(raw.equipment)) {
    const equipmentObj = raw.equipment as Record<string, unknown>;
    const equipRaw = equipmentObj.equip;
    const unequipRaw = equipmentObj.unequip;

    let equip: Partial<Record<EquipmentSlot, string>> | undefined;
    let unequip: EquipmentSlot[] | undefined;

    if (equipRaw !== undefined) {
      if (!equipRaw || typeof equipRaw !== "object" || Array.isArray(equipRaw)) {
        return NextResponse.json({ ok: false, error: "INVALID_EQUIP", message: "equipment.equip must be an object." }, { status: 400 });
      }
      equip = {};
      for (const [slot, itemId] of Object.entries(equipRaw as Record<string, unknown>)) {
        if (!isEquipmentSlot(slot)) {
          return NextResponse.json({ ok: false, error: "INVALID_EQUIPMENT_SLOT", message: `Unknown equipment slot: ${slot}` }, { status: 400 });
        }
        if (typeof itemId !== "string" || !itemId.trim()) {
          return NextResponse.json(
            { ok: false, error: "INVALID_EQUIP_ITEM", message: `equipment.equip.${slot} must be a non-empty item id string.` },
            { status: 400 }
          );
        }
        equip[slot] = itemId.trim();
      }
    }

    if (unequipRaw !== undefined) {
      if (!Array.isArray(unequipRaw)) {
        return NextResponse.json({ ok: false, error: "INVALID_UNEQUIP", message: "equipment.unequip must be an array of slots." }, { status: 400 });
      }
      unequip = [];
      for (const slot of unequipRaw) {
        if (typeof slot !== "string" || !isEquipmentSlot(slot)) {
          return NextResponse.json({ ok: false, error: "INVALID_EQUIPMENT_SLOT", message: `Unknown equipment slot: ${String(slot)}` }, { status: 400 });
        }
        unequip.push(slot);
      }
      if (new Set(unequip).size !== unequip.length) {
        return NextResponse.json({ ok: false, error: "DUPLICATE_UNEQUIP", message: "equipment.unequip must not contain duplicates." }, { status: 400 });
      }
    }

    const wantsEquipmentChange = Boolean((equip && Object.keys(equip).length) || (unequip && unequip.length));
    if (wantsEquipmentChange) {
      const inventoryState = Object.fromEntries(agent.inventory.map((row) => [row.itemId, row.quantity])) as Record<string, number>;
      const equipmentState = Object.fromEntries(agent.equipment.map((row) => [row.slot, row.itemId])) as Partial<Record<EquipmentSlot, string>>;

      const itemsById: Record<string, ItemDefinition> = {};
      for (const row of agent.inventory) itemsById[row.itemId] = itemToDefinition(row.item);
      for (const row of agent.equipment) itemsById[row.itemId] = itemToDefinition(row.item);

      const equipItemIds = Object.values(equip ?? {});
      const missingItemIds = equipItemIds.filter((id) => id && !itemsById[id]);
      if (missingItemIds.length) {
        const missing = await prisma.item.findMany({ where: { id: { in: missingItemIds } } });
        for (const item of missing) itemsById[item.id] = itemToDefinition(item);
      }

      let next;
      try {
        next = applyEquipmentChanges({
          inventory: inventoryState,
          equipment: equipmentState,
          itemsById,
          equip,
          unequip
        });
      } catch (err) {
        return NextResponse.json(
          { ok: false, error: "INVALID_EQUIPMENT_CHANGE", message: err instanceof Error ? err.message : "Invalid equipment change." },
          { status: 400 }
        );
      }

      const agentId = agent.id;
      await prisma.$transaction(async (tx) => {
        const nextInventoryIds = Object.keys(next.inventory);
        if (nextInventoryIds.length === 0) {
          await tx.agentInventoryItem.deleteMany({ where: { agentId } });
        } else {
          await tx.agentInventoryItem.deleteMany({ where: { agentId, itemId: { notIn: nextInventoryIds } } });
        }
        for (const [itemId, quantity] of Object.entries(next.inventory)) {
          await tx.agentInventoryItem.upsert({
            where: { agentId_itemId: { agentId, itemId } },
            create: { agentId, itemId, quantity },
            update: { quantity }
          });
        }

        const nextEquipmentEntries = Object.entries(next.equipment) as [EquipmentSlot, string][];
        const nextSlots = nextEquipmentEntries.map(([slot]) => slot);
        if (nextSlots.length === 0) {
          await tx.agentEquipmentItem.deleteMany({ where: { agentId } });
        } else {
          await tx.agentEquipmentItem.deleteMany({ where: { agentId, slot: { notIn: nextSlots } } });
        }
        for (const [slot, itemId] of nextEquipmentEntries) {
          await tx.agentEquipmentItem.upsert({
            where: { agentId_slot: { agentId, slot } },
            create: { agentId, slot, itemId },
            update: { itemId }
          });
        }
      });

      agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          location: true,
          inventory: { include: { item: true } },
          equipment: { include: { item: true } }
        }
      });
      if (!agent) {
        return NextResponse.json({ ok: false, error: "AGENT_STATE_ERROR", message: "Failed to load agent after equipment update." }, { status: 500 });
      }
    }
  }

  const questRaw = raw.quest;
  if (!questRaw) {
    return NextResponse.json({
      ok: true,
      message: "No quest taken. Applied any skill point and equipment changes.",
      agent: { username: agent.username, level: agent.level, xp: agent.xp, gold: agent.gold, unspent_skill_points: agent.unspentSkillPoints }
    });
  }

  if (agent.nextActionAvailableAt && now < agent.nextActionAvailableAt) {
    return NextResponse.json(
      {
        ok: false,
        error: "ACTION_ON_COOLDOWN",
        message: "You cannot take another action yet.",
        next_action_available_at: agent.nextActionAvailableAt.toISOString(),
        help: "Call GET /api/dashboard?username=... to see your current quest status."
      },
      { status: 409 }
    );
  }

  if (typeof questRaw !== "object" || Array.isArray(questRaw)) {
    return NextResponse.json({ ok: false, error: "INVALID_QUEST", message: "quest must be an object." }, { status: 400 });
  }

  const questObj = questRaw as Record<string, unknown>;
  const questId = typeof questObj.quest_id === "string" ? questObj.quest_id : "";
  const customAction = typeof questObj.custom_action === "string" ? questObj.custom_action.trim() : "";
  const skillsChosen = Array.isArray(questObj.skills) ? (questObj.skills as unknown[]) : null;

  if (!questId) return NextResponse.json({ ok: false, error: "MISSING_QUEST_ID", message: "quest.quest_id is required." }, { status: 400 });
  if (!skillsChosen || skillsChosen.length !== 3) {
    return NextResponse.json({ ok: false, error: "INVALID_SKILL_COUNT", message: "You must choose exactly 3 skills for a quest." }, { status: 400 });
  }
  if (!customAction) {
    return NextResponse.json({ ok: false, error: "MISSING_CUSTOM_ACTION", message: "quest.custom_action is required." }, { status: 400 });
  }

  const skills: Skill[] = [];
  for (const s of skillsChosen) {
    if (typeof s !== "string" || !isSkill(s)) {
      return NextResponse.json({ ok: false, error: "INVALID_SKILL", message: `Invalid skill: ${String(s)}` }, { status: 400 });
    }
    skills.push(s);
  }
  if (new Set(skills).size !== skills.length) {
    return NextResponse.json({ ok: false, error: "DUPLICATE_SKILLS", message: "Chosen skills must be distinct." }, { status: 400 });
  }

  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: { origin: true, destination: true, failDestination: true }
  });
  if (!quest || quest.status !== "active") {
    return NextResponse.json({ ok: false, error: "QUEST_NOT_FOUND", message: `Quest '${questId}' does not exist or is no longer available.` }, { status: 404 });
  }
  if (quest.originId !== agent.locationId) {
    return NextResponse.json(
      {
        ok: false,
        error: "QUEST_WRONG_LOCATION",
        message: "That quest is not available at your current location.",
        help: "Call GET /api/quests?location=<your location> to see current quests."
      },
      { status: 400 }
    );
  }
  if (quest.partySize > 1) {
    return NextResponse.json(
      { ok: false, error: "PARTY_NOT_IMPLEMENTED", message: "Party quests are not implemented yet. Pick a solo quest (party_size: 1)." },
      { status: 501 }
    );
  }

  const agentSkills = parseSkillValues(agent.skills);
  const multipliers = quest.skillMultipliers as SkillMultipliers;
  const rewards = quest.rewards as QuestRewards;

  const equippedItems: Record<string, ItemDefinition> = {};
  const currentEquipmentState = Object.fromEntries(agent.equipment.map((row) => [row.slot, row.itemId])) as Partial<Record<EquipmentSlot, string>>;
  for (const row of agent.equipment) equippedItems[row.itemId] = itemToDefinition(row.item);
  const equipmentBonuses = getEquipmentSkillBonuses({ equipment: currentEquipmentState, itemsById: equippedItems });

  const seed = `run:${agent.id}:${quest.id}:${now.toISOString()}`;
  const result = computeQuestResult({
    partySize: quest.partySize,
    baseChallengeRating: quest.challengeRating,
    rewards,
    skillsChosen: skills,
    baseSkills: agentSkills,
    multipliers,
    equipmentBonuses,
    seed,
    agentGold: agent.gold
  });

  const run = await prisma.questRun.create({
    data: {
      questId: quest.id,
      outcome: result.outcome,
      startedAt: now,
      effectiveSkill: result.effectiveSkill,
      randomFactor: result.randomFactor,
      successLevel: result.successLevel,
      rewardsGranted: { xp: result.xpGained, gold: result.goldGained, goldLost: result.goldLost },
      participants: {
        create: {
          agentId: agent.id,
          skillsChosen: skills,
          customAction,
          contributedEffectiveSkill: result.effectiveSkill,
          xpGained: result.xpGained,
          goldGained: result.goldGained,
          goldLost: result.goldLost
        }
      }
    }
  });

  const questDef: QuestDefinition = {
    quest_id: quest.id,
    name: quest.name,
    description: quest.description,
    origin: quest.origin.name,
    destination: quest.destination.name,
    fail_destination: quest.failDestination?.name ?? null,
    nearby_pois_for_journey: (quest.nearbyPois as string[] | null) ?? [],
    challenge_rating: quest.challengeRating,
    party_size: quest.partySize,
    skill_multipliers: multipliers,
    rewards
  };

  const statuses = mockGenerateStatusUpdates({
    quest: questDef,
    agent: { username: agent.username, skills_chosen: skills, custom_action: customAction },
    outcome: result.outcome,
    seed: `status:${seed}`
  });

  const locationNames = new Set<string>();
  for (const s of statuses) {
    locationNames.add(s.location);
    if (s.traveling_toward) locationNames.add(s.traveling_toward);
  }
  const locations = await prisma.location.findMany({ where: { name: { in: Array.from(locationNames) } } });
  const byName = new Map(locations.map((l) => [l.name, l]));

  await prisma.questStatusUpdate.createMany({
    data: statuses.map((s) => ({
      runId: run.id,
      step: s.step,
      text: s.text,
      locationId: byName.get(s.location)?.id ?? quest.originId,
      traveling: s.traveling,
      travelingTowardId: s.traveling_toward ? byName.get(s.traveling_toward)?.id ?? null : null
    }))
  });

  const nextActionAt = new Date(now.getTime() + cooldownMs());
  await prisma.agent.update({
    where: { id: agent.id },
    data: { lastActionAt: now, nextActionAvailableAt: nextActionAt }
  });

  return NextResponse.json({
    ok: true,
    run_id: run.id,
    outcome: result.outcome,
    started_at: now.toISOString(),
    next_action_available_at: nextActionAt.toISOString(),
    rewards: { xp_gained: result.xpGained, gold_gained: result.goldGained, gold_lost: result.goldLost },
    help: "Call GET /api/dashboard?username=... to watch progress."
  });
}
