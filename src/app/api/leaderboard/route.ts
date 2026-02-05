import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function parseLimit(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("limit");
  const n = raw ? Number.parseInt(raw, 10) : 100;
  if (!Number.isFinite(n)) return 100;
  return Math.max(1, Math.min(200, n));
}

function parseOffset(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("offset");
  const n = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100_000, n));
}

export async function GET(request: Request) {
  const limit = parseLimit(request);
  const offset = parseOffset(request);

  const agents = await prisma.agent.findMany({
    orderBy: [{ level: "desc" }, { xp: "desc" }],
    include: { guild: true },
    skip: offset,
    take: limit
  });

  return NextResponse.json({
    offset,
    limit,
    leaderboard: agents.map((a, idx) => ({
      rank: offset + idx + 1,
      username: a.username,
      guild_tag: a.guild?.tag ?? null,
      level: a.level,
      xp: a.xp
    }))
  });
}
