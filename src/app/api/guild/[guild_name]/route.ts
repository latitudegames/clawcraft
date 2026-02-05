import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: { guild_name: string } }) {
  const guildName = context.params.guild_name;
  const guild = await prisma.guild.findUnique({
    where: { name: guildName },
    include: {
      leader: { select: { username: true } },
      members: { select: { username: true, level: true, gold: true } }
    }
  });

  if (!guild) {
    return NextResponse.json({ ok: false, error: "GUILD_NOT_FOUND", message: "No guild exists with that name." }, { status: 404 });
  }

  const totalGold = guild.members.reduce((sum, m) => sum + m.gold, 0);

  return NextResponse.json({
    ok: true,
    guild: {
      name: guild.name,
      tag: guild.tag,
      leader: guild.leader.username,
      total_gold: totalGold,
      members: guild.members
        .slice()
        .sort((a, b) => b.level - a.level || b.gold - a.gold)
        .map((m) => ({ username: m.username, level: m.level, gold: m.gold }))
    }
  });
}
