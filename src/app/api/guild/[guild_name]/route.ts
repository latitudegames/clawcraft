import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: { guild_name: string } }) {
  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message: "Guild info endpoint not implemented yet.",
      guild_name: context.params.guild_name,
      help: "Planned: GET /guild/{guild_name} returns guild info + members."
    },
    { status: 501 }
  );
}

