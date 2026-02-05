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

  const guilds = await prisma.guild.findMany({
    include: { members: { select: { gold: true } } }
  });

  const rows = guilds
    .map((g) => ({ name: g.name, tag: g.tag, total_gold: g.members.reduce((sum, m) => sum + m.gold, 0) }))
    .sort((a, b) => b.total_gold - a.total_gold)
    .slice(offset, offset + limit);

  return NextResponse.json({
    offset,
    limit,
    leaderboard: rows.map((g, idx) => ({
      rank: offset + idx + 1,
      name: g.name,
      tag: g.tag,
      total_gold: g.total_gold
    }))
  });
}
