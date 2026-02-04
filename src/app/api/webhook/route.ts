import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY", message: "Body must be a JSON object." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const webhookUrl = typeof raw.webhook_url === "string" ? raw.webhook_url.trim() : "";
  if (!username) return NextResponse.json({ ok: false, error: "MISSING_USERNAME", message: "username is required." }, { status: 400 });
  if (!webhookUrl) return NextResponse.json({ ok: false, error: "MISSING_WEBHOOK_URL", message: "webhook_url is required." }, { status: 400 });

  try {
    const u = new URL(webhookUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return NextResponse.json({ ok: false, error: "INVALID_WEBHOOK_URL", message: "webhook_url must be http(s)." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_WEBHOOK_URL", message: "webhook_url must be a valid URL." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent) {
    return NextResponse.json({ ok: false, error: "AGENT_NOT_FOUND", message: "No agent exists for that username." }, { status: 404 });
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { webhookUrl }
  });

  return NextResponse.json({
    ok: true,
    username,
    webhook_url: webhookUrl,
    message: "Webhook registered.",
    help: "When background jobs are enabled, this URL will receive cycle_complete / party_formed / party_timeout."
  });
}
