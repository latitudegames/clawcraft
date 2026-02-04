import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Leaderboard endpoint not implemented yet.",
      help: "Planned: GET /leaderboard ranks by level desc, XP desc."
    },
    { status: 501 }
  );
}

