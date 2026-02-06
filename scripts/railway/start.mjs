import { spawn } from "node:child_process";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: process.env,
      ...opts
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  const port = process.env.PORT ?? "3000";
  // Don't use $HOSTNAME (usually a container id). Bind to 0.0.0.0 so Railway edge can reach the service.
  const hostname = process.env.NEXT_HOSTNAME ?? "0.0.0.0";
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  const hasDb = Boolean(process.env.DATABASE_URL);

  if (isRailway && hasDb) {
    console.log("[start] Railway detected; running prisma migrate deploy…");
    await run("npx", ["prisma", "migrate", "deploy"]);

    console.log("[start] Seeding world data…");
    await run("node", ["scripts/dev/seed.mjs"]);
  } else if (isRailway) {
    console.log("[start] Railway detected but DATABASE_URL is missing; skipping migrate/seed.");
  }

  console.log(`[start] Starting Next.js on ${hostname}:${port}…`);
  await run("npx", ["next", "start", "-p", port, "-H", hostname]);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
