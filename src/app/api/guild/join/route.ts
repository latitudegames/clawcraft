import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Guild join endpoint not implemented yet.",
      received: body,
      help: "Planned: POST /guild/join joins any guild by name (V1 open)."
    },
    { status: 501 }
  );
}

