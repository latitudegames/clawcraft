import { NextResponse } from "next/server";

import { DEV_CONFIG } from "@/config/dev-mode";
import { mockGenerateQuest } from "@/lib/ai/mock-llm";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const TARGET_QUESTS_PER_LOCATION = 3;

async function ensureMockQuestsForLocation(locationId: string, locationName: string) {
  const existing = await prisma.quest.findMany({
    where: { status: "active", originId: locationId },
    select: { id: true }
  });
  const needed = Math.max(0, TARGET_QUESTS_PER_LOCATION - existing.length);
  if (needed === 0) return;

  const connections = await prisma.locationConnection.findMany({
    where: { fromId: locationId },
    include: { to: true }
  });
  let destinations = connections.map((c) => c.to.name);
  if (destinations.length < 2) {
    const all = await prisma.location.findMany({ where: { id: { not: locationId } } });
    destinations = all.map((l) => l.name);
  }
  if (destinations.length === 0) return;

  const nearbyPois = Array.from(new Set([locationName, ...destinations])).slice(0, 3);

  for (let i = 0; i < needed; i++) {
    const seed = `mock:${locationName}:q:${existing.length + i}`;
    const quest = mockGenerateQuest({
      origin: locationName,
      destinations,
      nearbyPois,
      seed
    });

    const requiredLocationNames = [quest.destination, quest.fail_destination].filter(Boolean) as string[];
    const requiredLocations = await prisma.location.findMany({ where: { name: { in: requiredLocationNames } } });
    const byName = new Map(requiredLocations.map((l) => [l.name, l]));
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
        originId: locationId,
        destinationId: dest.id,
        failDestinationId: fail?.id ?? null,
        partySize: quest.party_size,
        challengeRating: quest.challenge_rating,
        skillMultipliers: quest.skill_multipliers,
        rewards: quest.rewards,
        nearbyPois: quest.nearby_pois_for_journey
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
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");

  if (!location) {
    return NextResponse.json({ ok: false, error: "MISSING_LOCATION", message: "location query param is required." }, { status: 400 });
  }

  const loc = await prisma.location.findUnique({ where: { name: location } });
  if (!loc) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNKNOWN_LOCATION",
        message: `Unknown location: ${location}`,
        help: "Run `npm run dev:seed` to create default locations."
      },
      { status: 404 }
    );
  }

  if (DEV_CONFIG.DEV_MODE && DEV_CONFIG.MOCK_LLM) {
    await ensureMockQuestsForLocation(loc.id, loc.name);
  }

  const quests = await prisma.quest.findMany({
    where: { status: "active", originId: loc.id },
    include: {
      destination: true,
      partyQueue: { include: { participants: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    location: loc.name,
    quests: quests.map((q) => ({
      quest_id: q.id,
      name: q.name,
      description: q.description,
      destination: q.destination.name,
      challenge_rating: q.challengeRating,
      party_size: q.partySize,
      agents_queued: q.partyQueue?.participants.length ?? 0
    })),
    help: "Call POST /api/action with quest_id, skills (array of 3), and custom_action (string) to embark."
  });
}
