import { prisma } from "@/lib/db/prisma";
import { applyQuestResolution } from "@/lib/game/quest-effects";
import { pickItemIdForDrop, rollItemRarity } from "@/lib/game/item-drops";
import { partyChallengeRating } from "@/lib/game/formulas";
import { createRng } from "@/lib/utils/rng";
import type { ItemRarity } from "@/types/items";
import type { SkillMultipliers } from "@/types/skills";

export async function resolveQuestRun(runId: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.questRun.findUnique({
      where: { id: runId },
      include: {
        quest: true,
        participants: { include: { agent: true } }
      }
    });
    if (!run) throw new Error(`QuestRun not found: ${runId}`);
    if (run.resolvedAt) return run;

    const lock = await tx.questRun.updateMany({
      where: { id: runId, resolvedAt: null },
      data: { resolvedAt: now }
    });
    if (lock.count === 0) return run;

    const challengeRatingUsed = partyChallengeRating(run.quest.challengeRating, run.quest.partySize);
    const multipliers = run.quest.skillMultipliers as SkillMultipliers;

    const destinationId =
      run.outcome === "failure" && run.quest.failDestinationId ? run.quest.failDestinationId : run.quest.destinationId;

    const allItems = await tx.item.findMany({
      select: { id: true, name: true, rarity: true }
    });
    const itemNameById = new Map(allItems.map((it) => [it.id, it.name]));

    const itemsByRarity: Record<ItemRarity, string[]> = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: []
    };
    for (const item of allItems) {
      const rarity = item.rarity as ItemRarity;
      if (!itemsByRarity[rarity]) continue;
      itemsByRarity[rarity].push(item.id);
    }
    for (const rarity of Object.keys(itemsByRarity) as ItemRarity[]) {
      itemsByRarity[rarity].sort();
    }

    for (const participant of run.participants) {
      const agent = participant.agent;
      const journeyLog = (agent.journeyLog as string[] | null) ?? [];

      const itemsGained: string[] = [];
      if (run.outcome !== "failure" && run.outcome !== "timeout") {
        const rng = createRng(`drop:${run.questId}:${agent.id}:${run.startedAt.toISOString()}`);
        const preferredRarity = rollItemRarity({
          challengeRating: challengeRatingUsed,
          dropRoll: rng.next(),
          rarityRoll: rng.next()
        });

        if (preferredRarity) {
          const itemId = pickItemIdForDrop({
            itemsByRarity,
            preferredRarity,
            roll: rng.next()
          });
          if (itemId) {
            await tx.agentInventoryItem.upsert({
              where: { agentId_itemId: { agentId: agent.id, itemId } },
              create: { agentId: agent.id, itemId, quantity: 1 },
              update: { quantity: { increment: 1 } }
            });

            const name = itemNameById.get(itemId);
            if (name) itemsGained.push(name);
          }
        }
      }

      const effects = applyQuestResolution({
        agent: {
          xp: agent.xp,
          gold: agent.gold,
          unspentSkillPoints: agent.unspentSkillPoints,
          journeyLog
        },
        quest: {
          name: run.quest.name,
          outcome: run.outcome === "timeout" ? "failure" : run.outcome,
          challengeRating: challengeRatingUsed,
          effectiveSkill: run.effectiveSkill ?? 0,
          randomFactor: run.randomFactor ?? 0,
          successLevel: run.successLevel ?? 0,
          skillsChosen: participant.skillsChosen,
          multipliers
        },
        rewards: {
          xpGained: participant.xpGained ?? 0,
          goldGained: participant.goldGained ?? 0,
          goldLost: participant.goldLost ?? 0
        },
        itemsGained
      });

      await tx.agent.update({
        where: { id: agent.id },
        data: {
          xp: effects.agent.xp,
          level: effects.agent.level,
          gold: effects.agent.gold,
          unspentSkillPoints: effects.agent.unspentSkillPoints,
          journeyLog: effects.agent.journeyLog,
          lastQuestResult: effects.agent.lastQuestResult,
          locationId: destinationId,
          nextActionAvailableAt: null
        }
      });
    }

    return run;
  });
}
