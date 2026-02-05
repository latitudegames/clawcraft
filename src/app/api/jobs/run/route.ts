import { NextResponse } from "next/server";

import { runBackgroundJobs } from "@/lib/server/jobs/run-jobs";

export const runtime = "nodejs";

function authOk(request: Request): boolean {
  const secret = process.env.JOB_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authOk(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED", message: "Missing or invalid JOB_SECRET." }, { status: 401 });
  }

  try {
    const result = await runBackgroundJobs({ now: new Date() });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: "JOB_FAILED", message }, { status: 500 });
  }
}

