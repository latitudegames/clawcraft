import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const GUILD_CREATE_COST_GOLD = 500;

function normalizeTag(tag: string): string {
  return tag.trim().toUpperCase();
}

function isValidTag(tag: string): boolean {
  if (tag.length < 3 || tag.length > 4) return false;
  return /^[A-Z0-9]+$/.test(tag);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY", message: "Body must be a JSON object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const guildName = typeof raw.guild_name === "string" ? raw.guild_name.trim() : typeof raw.name === "string" ? raw.name.trim() : "";
  const tagRaw = typeof raw.tag === "string" ? raw.tag : "";
  const tag = normalizeTag(tagRaw);

  if (!username) return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });
  if (!guildName) return NextResponse.json({ ok: false, error: "MISSING_GUILD_NAME", message: "guild_name is required." }, { status: 400 });
  if (!tag) return NextResponse.json({ ok: false, error: "MISSING_TAG", message: "tag is required." }, { status: 400 });
  if (!isValidTag(tag)) {
    return NextResponse.json({ ok: false, error: "INVALID_TAG", message: "tag must be 3-4 characters, A-Z/0-9." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }
  if (agent.guildId) {
    return NextResponse.json({ ok: false, error: "ALREADY_IN_GUILD", message: "You are already in a guild." }, { status: 409 });
  }
  if (agent.gold < GUILD_CREATE_COST_GOLD) {
    return NextResponse.json(
      {
        ok: false,
        error: "INSUFFICIENT_GOLD",
        message: "Not enough gold to create a guild.",
        required: GUILD_CREATE_COST_GOLD,
        available: agent.gold
      },
      { status: 400 }
    );
  }

  try {
    const guild = await prisma.$transaction(async (tx) => {
      const guild = await tx.guild.create({
        data: {
          name: guildName,
          tag,
          leaderId: agent.id
        }
      });
      await tx.agent.update({
        where: { id: agent.id },
        data: { gold: agent.gold - GUILD_CREATE_COST_GOLD, guildId: guild.id }
      });
      return guild;
    });

    return NextResponse.json({
      ok: true,
      guild: { name: guild.name, tag: guild.tag },
      cost_gold: GUILD_CREATE_COST_GOLD,
      help: "Next: POST /api/guild/join or GET /api/guild/{guild_name}."
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: false, error: "GUILD_CONFLICT", message: "Guild name or tag already exists." }, { status: 409 });
    }
    throw err;
  }
}
