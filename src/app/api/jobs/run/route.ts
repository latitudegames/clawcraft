import { NextResponse } from "next/server";

import { runBackgroundJobs } from "@/lib/server/jobs/run-jobs";

export const runtime = "nodejs";

function authOk(request: Request): boolean {
  const secrets = [process.env.JOB_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (secrets.length === 0) return true;

  const auth = request.headers.get("authorization");
  if (auth && secrets.some((secret) => auth === `Bearer ${secret}`)) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret && secrets.includes(querySecret)) return true;

  return false;
}

async function handle(request: Request) {
  if (!authOk(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: "Missing or invalid secret." },
      { status: 401 }
    );
  }

  try {
    const result = await runBackgroundJobs({ now: new Date() });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: "JOB_FAILED", message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
