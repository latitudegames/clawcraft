import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { parseSkillValues, validateCreateCharacterSkillAllocation } from "@/lib/game/character";
import { levelFromTotalXp } from "@/lib/game/formulas";

export const runtime = "nodejs";

const DEFAULT_START_LOCATION = "King's Landing";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY", message: "Body must be a JSON object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  if (!username) {
    return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });
  }

  const profilePictureId = typeof raw.profile_picture_id === "number" && Number.isInteger(raw.profile_picture_id) ? raw.profile_picture_id : 0;
  const requestedLocation = typeof raw.location === "string" ? raw.location.trim() : "";
  const startLocationName = requestedLocation || DEFAULT_START_LOCATION;

  let skills;
  try {
    skills = parseSkillValues(raw.skills);
    validateCreateCharacterSkillAllocation(skills);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_SKILLS",
        message: err instanceof Error ? err.message : "Invalid skills allocation.",
        help: "Provide a skills object allocating exactly 20 points across the 15 skills, with a max of 10 per skill at creation."
      },
      { status: 400 }
    );
  }

  const location = await prisma.location.findUnique({ where: { name: startLocationName } });
  if (!location) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNKNOWN_LOCATION",
        message: `Unknown start location: ${startLocationName}`,
        help: "Run `npm run dev:seed` to create default locations, or pass a valid location name."
      },
      { status: 400 }
    );
  }

  try {
    const agent = await prisma.agent.create({
      data: {
        username,
        profilePictureId,
        level: 1,
        xp: 0,
        gold: 0,
        unspentSkillPoints: 0,
        skills,
        locationId: location.id,
        journeyLog: [`Started adventure at ${location.name}.`]
      }
    });

    const { level, xpToNextLevel } = levelFromTotalXp(agent.xp);
    return NextResponse.json(
      {
        ok: true,
        agent: {
          username: agent.username,
          profile_picture_id: agent.profilePictureId,
          level,
          xp: agent.xp,
          xp_to_next_level: xpToNextLevel,
          gold: agent.gold,
          location: location.name,
          guild: null,
          skills: agent.skills,
          unspent_skill_points: agent.unspentSkillPoints,
          equipment: { head: null, chest: null, legs: null, boots: null, right_hand: null, left_hand: null },
          inventory: []
        },
        help: "Next: GET /api/quests?location=... then POST /api/action"
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "USERNAME_TAKEN",
          message: "That username is already registered."
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
