import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY", message: "Body must be a JSON object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const guildName = typeof raw.guild_name === "string" ? raw.guild_name.trim() : typeof raw.name === "string" ? raw.name.trim() : "";

  if (!username) return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });
  if (!guildName) return NextResponse.json({ ok: false, error: "MISSING_GUILD_NAME", message: "guild_name is required." }, { status: 400 });

  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }
  if (agent.guildId) {
    return NextResponse.json({ ok: false, error: "ALREADY_IN_GUILD", message: "You are already in a guild." }, { status: 409 });
  }

  const guild = await prisma.guild.findUnique({ where: { name: guildName } });
  if (!guild) {
    return NextResponse.json({ ok: false, error: "GUILD_NOT_FOUND", message: "No guild exists with that name." }, { status: 404 });
  }

  await prisma.agent.update({ where: { id: agent.id }, data: { guildId: guild.id } });

  return NextResponse.json({
    ok: true,
    guild: { name: guild.name, tag: guild.tag },
    help: "Next: GET /api/dashboard?username=... or GET /api/guild/{guild_name}."
  });
}
