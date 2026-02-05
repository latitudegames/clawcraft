/* eslint-disable no-console */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const LOCATION = process.env.LOCATION ?? "King's Landing";
const DEMO_AGENTS = Number.parseInt(process.env.DEMO_AGENTS ?? "12", 10);
const INCLUDE_PARTY = process.env.DEMO_PARTY === "1" || process.argv.includes("--party");
const RUN_ID = process.env.DEMO_RUN_ID ?? Date.now().toString(36);

function usage() {
  console.log("Clawcraft demo populater (creates agents + starts quests)");
  console.log("");
  console.log("Prereqs:");
  console.log("  - `npm run dev` running (default on http://localhost:3000)");
  console.log("  - DB migrated + seeded (`npm run dev:seed`)");
  console.log("");
  console.log("Env overrides:");
  console.log("  BASE_URL=http://localhost:3000");
  console.log("  LOCATION=\"King's Landing\"  (starting location fallback)");
  console.log("  DEMO_AGENTS=12");
  console.log("  DEMO_PARTY=1  (or pass --party)");
  console.log("  DEMO_RUN_ID=abc123  (defaults to timestamp)");
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bestEffortJobsRun() {
  const jobs = await request("POST", "/api/jobs/run");
  console.log("POST /api/jobs/run", jobs.res.status);
  return jobs;
}

async function getWorldLocations() {
  const state = await request("GET", "/api/world-state");
  if (!state.res.ok) return null;
  return state.json?.locations?.map?.((l) => l?.name).filter(Boolean) ?? null;
}

function buildSkills(primary) {
  const out = {
    melee: 0,
    ranged: 0,
    unarmed: 0,
    elemental: 0,
    healing: 0,
    necromancy: 0,
    enchantment: 0,
    illusion: 0,
    summoning: 0,
    stealth: 0,
    lockpicking: 0,
    poison: 0,
    persuasion: 0,
    deception: 0,
    seduction: 0
  };

  for (const [skill, points] of Object.entries(primary)) out[skill] = points;
  return out;
}

const BUILDS = [
  { label: "rogue", skills: buildSkills({ stealth: 10, lockpicking: 6, illusion: 4 }), chosen: ["stealth", "lockpicking", "illusion"] },
  { label: "knight", skills: buildSkills({ melee: 10, unarmed: 6, persuasion: 4 }), chosen: ["melee", "unarmed", "persuasion"] },
  { label: "mage", skills: buildSkills({ elemental: 10, illusion: 6, enchantment: 4 }), chosen: ["elemental", "illusion", "enchantment"] },
  { label: "healer", skills: buildSkills({ healing: 10, persuasion: 6, deception: 4 }), chosen: ["healing", "persuasion", "deception"] }
];

async function ensureQuestsForLocation(locationName) {
  const quests = await request("GET", `/api/quests?location=${encodeURIComponent(locationName)}`);
  if (!quests.res.ok) {
    console.log("GET /api/quests", quests.res.status, locationName);
    console.log(quests.json);
  }
  return quests;
}

async function createAgent(username, locationName, buildIdx) {
  const build = BUILDS[buildIdx % BUILDS.length];
  const created = await request("POST", "/api/create-character", {
    username,
    profile_picture_id: buildIdx % 3,
    location: locationName,
    skills: build.skills
  });

  console.log("POST /api/create-character", created.res.status, username);
  if (!created.res.ok && created.res.status !== 409) console.log(created.json);
  return { created, build };
}

async function startQuest(username, questId, chosenSkills, customAction) {
  const action = await request("POST", "/api/action", {
    username,
    quest: {
      quest_id: questId,
      skills: chosenSkills,
      custom_action: customAction
    }
  });
  console.log("POST /api/action", action.res.status, username);
  if (!action.res.ok) console.log(action.json);
  return action;
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    usage();
    return;
  }

  await bestEffortJobsRun();

  const locationNames = (await getWorldLocations()) ?? [LOCATION];
  const uniqueLocations = Array.from(new Set(locationNames)).slice(0, 8);
  const questsByLocation = new Map();

  for (const name of uniqueLocations) {
    const res = await ensureQuestsForLocation(name);
    if (res.res.ok) questsByLocation.set(name, res.json?.quests ?? []);
  }

  const usernames = [];
  const desiredAgents = Number.isFinite(DEMO_AGENTS) ? Math.max(1, Math.min(40, DEMO_AGENTS)) : 12;

  const partyLocation = uniqueLocations[0] ?? LOCATION;
  const partyQuests = questsByLocation.get(partyLocation) ?? [];
  const partyQuest = INCLUDE_PARTY ? partyQuests.find((q) => q?.party_size > 1 && (q?.agents_queued ?? 0) === 0) ?? partyQuests.find((q) => q?.party_size > 1) : null;

  let reservedForParty = 0;
  if (INCLUDE_PARTY && partyQuest?.quest_id && partyQuest?.party_size > 1) {
    reservedForParty = Math.max(0, Math.min(desiredAgents, partyQuest.party_size));
    console.log("");
    console.log(`Party quest: ${partyQuest.name} @ ${partyLocation} (party_size=${partyQuest.party_size})`);
  }

  for (let i = 0; i < desiredAgents; i++) {
    const isPartyMember = INCLUDE_PARTY && i < reservedForParty && partyQuest?.quest_id;
    const locationName = isPartyMember ? partyLocation : uniqueLocations[i % uniqueLocations.length] ?? LOCATION;
    const buildIdx = i % BUILDS.length;
    const build = BUILDS[buildIdx];
    const username = `demo_${RUN_ID}_${build.label}_${i + 1}`;
    usernames.push(username);
    await createAgent(username, locationName, buildIdx);

    const questList = questsByLocation.get(locationName) ?? [];
    const soloQuest = questList.find((q) => q?.party_size === 1) ?? questList[0];
    if (!soloQuest?.quest_id) continue;

    const questId = isPartyMember ? partyQuest.quest_id : soloQuest.quest_id;
    const actionText = isPartyMember
      ? "Team up: scout ahead, cover each other, and share supplies."
      : "Head out carefully, improvise as needed, and bring back loot.";

    await startQuest(username, questId, build.chosen, actionText);
  }

  await sleep(1_100);
  const worldState = await request("GET", "/api/world-state");
  console.log("");
  console.log("GET /api/world-state", worldState.res.status);
  if (worldState.res.ok) {
    console.log(`Agents in world-state: ${(worldState.json?.agents ?? []).length}`);
  } else {
    console.log(worldState.json);
  }

  console.log("");
  console.log("Demo agents created:");
  for (const u of usernames) console.log(`- ${u}`);
  console.log("");
  console.log(`Open ${BASE_URL}/ to watch the map.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
