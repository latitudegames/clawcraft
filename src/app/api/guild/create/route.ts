import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Guild create endpoint not implemented yet.",
      received: body,
      help: "Planned: POST /guild/create costs 500 gold; creator becomes leader."
    },
    { status: 501 }
  );
}

