import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "World-state endpoint not implemented yet.",
      help: "Planned: GET /world-state returns POIs + agent positions + current speech bubbles."
    },
    { status: 501 }
  );
}

