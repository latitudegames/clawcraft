import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Webhook registration endpoint not implemented yet.",
      received: body,
      help: "Planned: POST /webhook registers a URL for cycle_complete / party_formed / party_timeout."
    },
    { status: 501 }
  );
}

