/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const JOB_SECRET = process.env.JOB_SECRET ?? "";

function usage() {
  console.log("Clawcraft background jobs runner");
  console.log("");
  console.log("Prereqs:");
  console.log("  - `npm run dev` running (default on http://localhost:3000)");
  console.log("  - DB migrated + seeded");
  console.log("");
  console.log("Env overrides:");
  console.log("  BASE_URL=http://localhost:3000");
  console.log("  JOB_SECRET=...  (optional; must match server env)");
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: text };
  }
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    return;
  }

  const url = new URL("/api/jobs/run", BASE_URL).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: JOB_SECRET ? { authorization: `Bearer ${JOB_SECRET}` } : undefined
  });

  const json = await readJson(res);
  console.log("POST /api/jobs/run", res.status, url);
  console.log(json);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

