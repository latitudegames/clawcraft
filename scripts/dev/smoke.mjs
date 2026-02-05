/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const LOCATION = process.env.LOCATION ?? "King's Landing";
const USERNAME = process.env.USERNAME ?? "codex_smoke";
const INCLUDE_PARTY = process.env.SMOKE_PARTY === "1" || process.argv.includes("--party");

function usage() {
  console.log("Clawcraft API smoke runner");
  console.log("");
  console.log("Prereqs:");
  console.log("  - `npm run dev` running (default on http://localhost:3000)");
  console.log("  - DB migrated + seeded (once implemented)");
  console.log("");
  console.log("Env overrides:");
  console.log("  BASE_URL=http://localhost:3000");
  console.log("  LOCATION=\"King's Landing\"");
  console.log("  USERNAME=codex_smoke");
  console.log("  SMOKE_PARTY=1 (or pass --party)");
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: text };
  }
}

async function request(method, path, body) {
  const url = new URL(path, BASE_URL).toString();
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await readJson(res);
  return { res, json, url };
}

async function bestEffortJobsRun() {
  const jobs = await request("POST", "/api/jobs/run");
  console.log("POST /api/jobs/run", jobs.res.status, jobs.url);
  console.log(jobs.json);
  console.log("");
  return jobs;
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    return;
  }

  await bestEffortJobsRun();

  const createCharacter = await request("POST", "/api/create-character", {
    username: USERNAME,
    profile_picture_id: 0,
    skills: {
      stealth: 10,
      lockpicking: 6,
      illusion: 4
    }
  });
  console.log("POST /api/create-character", createCharacter.res.status, createCharacter.url);
  console.log(createCharacter.json);
  console.log("");

  const quests = await request("GET", `/api/quests?location=${encodeURIComponent(LOCATION)}`);
  console.log("GET /api/quests", quests.res.status, quests.url);
  console.log(quests.json);
  console.log("");

  const partyQuest =
    quests.json?.quests?.find?.((q) => q?.party_size > 1 && (q?.agents_queued ?? 0) === 0) ??
    quests.json?.quests?.find?.((q) => q?.party_size > 1);

  if (INCLUDE_PARTY && partyQuest?.quest_id && partyQuest?.party_size > 1) {
    const questId = partyQuest.quest_id;
    const partySize = partyQuest.party_size;
    const queued = partyQuest.agents_queued ?? 0;
    const need = Math.max(0, partySize - queued);

    console.log(`Party quest selected: ${partyQuest.name} (quest_id=${questId}, party_size=${partySize}, queued=${queued})`);
    console.log("");

    const partyNames = Array.from({ length: need }, (_v, i) => `${USERNAME}_party_${i + 1}`);
    for (const name of partyNames) {
      const created = await request("POST", "/api/create-character", {
        username: name,
        profile_picture_id: 0,
        location: LOCATION,
        skills: {
          stealth: 10,
          lockpicking: 6,
          illusion: 4
        }
      });
      console.log("POST /api/create-character (party)", created.res.status, created.url, name);
      console.log(created.json);
      console.log("");

      const joined = await request("POST", "/api/action", {
        username: name,
        quest: {
          quest_id: questId,
          skills: ["stealth", "lockpicking", "illusion"],
          custom_action: "Team up: scout ahead, disable traps, and cover each other on the approach."
        }
      });
      console.log("POST /api/action (party)", joined.res.status, joined.url, name);
      console.log(joined.json);
      console.log("");

      if (joined.json?.run_id) {
        const dash = await request("GET", `/api/dashboard?username=${encodeURIComponent(name)}`);
        console.log("GET /api/dashboard (party)", dash.res.status, dash.url, name);
        console.log(dash.json);
        console.log("");
      }
    }
  } else if (INCLUDE_PARTY) {
    console.log("No party quest found; skipping party flow.");
    console.log("");
  }

  const soloQuest = quests.json?.quests?.find?.((q) => q?.party_size === 1) ?? quests.json?.quests?.[0];
  const questId = soloQuest?.quest_id;
  if (!questId) {
    console.log("No quest_id found (expected once /api/quests is implemented).");
    return;
  }

  const action = await request("POST", "/api/action", {
    username: USERNAME,
    quest: {
      quest_id: questId,
      skills: ["stealth", "lockpicking", "illusion"],
      custom_action: "Move at night, distract guards with illusion, and pick locks quietly."
    }
  });
  console.log("POST /api/action", action.res.status, action.url);
  console.log(action.json);
  console.log("");

  const dashboard = await request("GET", `/api/dashboard?username=${encodeURIComponent(USERNAME)}`);
  console.log("GET /api/dashboard", dashboard.res.status, dashboard.url);
  console.log(dashboard.json);

  const agentPublic = await request("GET", `/api/agent/${encodeURIComponent(USERNAME)}`);
  console.log("");
  console.log("GET /api/agent/[username]", agentPublic.res.status, agentPublic.url);
  console.log(agentPublic.json);

  const worldState = await request("GET", "/api/world-state");
  console.log("");
  console.log("GET /api/world-state", worldState.res.status, worldState.url);
  console.log(worldState.json);

  await bestEffortJobsRun();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
