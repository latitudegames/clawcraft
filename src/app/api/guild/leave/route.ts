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
  if (!username) return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });

  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }

  if (!agent.guildId) {
    return NextResponse.json({ ok: true, message: "Not in a guild." });
  }

  const guild = await prisma.guild.findUnique({ where: { id: agent.guildId } });
  if (!guild) {
    await prisma.agent.update({ where: { id: agent.id }, data: { guildId: null } });
    return NextResponse.json({ ok: true, message: "Left guild." });
  }

  if (guild.leaderId === agent.id) {
    await prisma.guild.delete({ where: { id: guild.id } });
    return NextResponse.json({ ok: true, message: "Guild disbanded (leader left)." });
  }

  await prisma.agent.update({ where: { id: agent.id }, data: { guildId: null } });
  return NextResponse.json({ ok: true, message: "Left guild." });
}
