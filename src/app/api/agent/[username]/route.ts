import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: { username: string } }) {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Agent endpoint not implemented yet.",
      username: context.params.username,
      help: "Planned: GET /agent/{username} returns public agent card data."
    },
    { status: 501 }
  );
}

