import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Guild leave endpoint not implemented yet.",
      received: body,
      help: "Planned: POST /guild/leave leaves current guild instantly (V1)."
    },
    { status: 501 }
  );
}

