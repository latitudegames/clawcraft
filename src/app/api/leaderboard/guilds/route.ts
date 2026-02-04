import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Guild leaderboard endpoint not implemented yet.",
      help: "Planned: GET /leaderboard/guilds ranks by total member gold."
    },
    { status: 501 }
  );
}

