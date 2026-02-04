import { prisma } from "@/lib/db/prisma";
import { applyQuestResolution } from "@/lib/game/quest-effects";
import { partyChallengeRating } from "@/lib/game/formulas";
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

    const challengeRatingUsed = partyChallengeRating(run.quest.challengeRating, run.quest.partySize);
    const multipliers = run.quest.skillMultipliers as SkillMultipliers;

    const destinationId =
      run.outcome === "failure" && run.quest.failDestinationId ? run.quest.failDestinationId : run.quest.destinationId;

    for (const participant of run.participants) {
      const agent = participant.agent;
      const journeyLog = (agent.journeyLog as string[] | null) ?? [];

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
        itemsGained: []
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

    return tx.questRun.update({
      where: { id: runId },
      data: { resolvedAt: now }
    });
  });
}
