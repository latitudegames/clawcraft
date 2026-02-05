import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadDotEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const valueRaw = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      if (process.env[key] !== undefined) continue;
      const value =
        (valueRaw.startsWith("\"") && valueRaw.endsWith("\"")) || (valueRaw.startsWith("'") && valueRaw.endsWith("'"))
          ? valueRaw.slice(1, -1)
          : valueRaw;
      process.env[key] = value;
    }
  } catch {
    // ignore missing files
  }
}

function loadEnv() {
  const root = process.cwd();
  loadDotEnvFile(path.join(root, ".env"));
  loadDotEnvFile(path.join(root, ".env.local"));
}

function usage() {
  console.log("Clawcraft OpenRouter status generator (dev)");
  console.log("");
  console.log("Generates 20 quest journey status updates (JSON) per game-design.md.");
  console.log("");
  console.log("Env (set in .env / .env.local or via shell):");
  console.log("  OPENROUTER_API_KEY=...");
  console.log("  OPENROUTER_MODEL=deepseek/deepseek-v3.2");
  console.log("  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1");
  console.log("  OPENROUTER_TIMEOUT_MS=25000");
  console.log("");
  console.log("Args:");
  console.log("  --input <json>   Optional scenario input file");
  console.log("  --out <json>     Optional output file for validated payload");
  console.log("  --retries <n>    Retry count on validation failure (default 1)");
  console.log("  --help           Show help");
  console.log("");
  console.log("Examples:");
  console.log("  npm run dev:llm:status");
  console.log("  node scripts/dev/llm-status.mjs --out /tmp/statuses.json");
  console.log("  node scripts/dev/llm-status.mjs --input ./scripts/dev/status-input.example.json");
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
      continue;
    }
    out[key] = true;
  }
  return out;
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const firstNewline = trimmed.indexOf("\n");
  if (firstNewline === -1) return trimmed;
  const withoutFirstLine = trimmed.slice(firstNewline + 1);
  const endFence = withoutFirstLine.lastIndexOf("```");
  if (endFence === -1) return withoutFirstLine.trim();
  return withoutFirstLine.slice(0, endFence).trim();
}

export function extractFirstJsonObject(text) {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    // fall through
  }

  const unfenced = stripCodeFences(direct);
  try {
    return JSON.parse(unfenced);
  } catch {
    // fall through
  }

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  const slice = unfenced.slice(start, end + 1);
  return JSON.parse(slice);
}

export function buildDefaultScenario() {
  return {
    quest: {
      name: "Clear the Goblin Cave",
      description: "Goblins have been raiding caravans near the cave entrance.",
      origin: "King's Landing",
      destination: "Goblin Cave",
      fail_destination: "Whispering Woods"
    },
    available_locations: ["King's Landing", "Goblin Cave", "Whispering Woods"],
    agent: {
      username: "codex_smoke",
      skills_chosen: ["stealth", "lockpicking", "illusion"],
      custom_action: "Wait for nightfall, distract sentries with an illusion, then pick the side gate quietly."
    },
    outcome: "success",
    party_members: null
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStatusPayload(payload, scenario) {
  const errors = [];

  if (!isObject(payload)) {
    errors.push("payload must be an object");
  }

  const statuses = isObject(payload) ? payload.statuses : undefined;
  if (!Array.isArray(statuses)) {
    errors.push("payload.statuses must be an array");
  } else if (statuses.length !== 20) {
    errors.push(`payload.statuses must have 20 items (got ${statuses.length})`);
  }

  const allowed = new Set(Array.isArray(scenario?.available_locations) ? scenario.available_locations : []);
  const origin = scenario?.quest?.origin;
  const destination = scenario?.quest?.destination;
  const failDestination = scenario?.quest?.fail_destination;
  const finalDestination = scenario?.outcome === "failure" && failDestination ? failDestination : destination;

  const steps = new Set();
  for (const entry of Array.isArray(statuses) ? statuses : []) {
    if (!isObject(entry)) {
      errors.push("each status must be an object");
      continue;
    }
    const step = entry.step;
    if (!Number.isInteger(step)) {
      errors.push("status.step must be an integer");
    } else {
      if (step < 1 || step > 20) errors.push(`status.step out of range: ${step}`);
      if (steps.has(step)) errors.push(`duplicate status.step: ${step}`);
      steps.add(step);
    }

    if (typeof entry.text !== "string" || entry.text.trim().length === 0) {
      errors.push(`status.text must be a non-empty string (step ${entry.step ?? "?"})`);
    } else if (entry.text.length > 180) {
      errors.push(`status.text too long (step ${entry.step ?? "?"}, len ${entry.text.length})`);
    }

    if (typeof entry.location !== "string" || entry.location.trim().length === 0) {
      errors.push(`status.location must be a string (step ${entry.step ?? "?"})`);
    } else if (allowed.size > 0 && !allowed.has(entry.location)) {
      errors.push(`status.location not in available_locations (step ${entry.step ?? "?"}): ${entry.location}`);
    }

    if (typeof entry.traveling !== "boolean") {
      errors.push(`status.traveling must be boolean (step ${entry.step ?? "?"})`);
    }

    if (entry.traveling === true) {
      if (typeof entry.traveling_toward !== "string" || entry.traveling_toward.trim().length === 0) {
        errors.push(`status.traveling_toward required when traveling=true (step ${entry.step ?? "?"})`);
      } else if (allowed.size > 0 && !allowed.has(entry.traveling_toward)) {
        errors.push(
          `status.traveling_toward not in available_locations (step ${entry.step ?? "?"}): ${entry.traveling_toward}`
        );
      }
    } else if (entry.traveling_toward !== undefined && entry.traveling_toward !== null) {
      errors.push(`status.traveling_toward must be omitted when traveling=false (step ${entry.step ?? "?"})`);
    }
  }

  if (Array.isArray(statuses)) {
    const byStep = new Map(statuses.filter((s) => isObject(s)).map((s) => [s.step, s]));
    const first = byStep.get(1);
    const last = byStep.get(20);
    if (origin && first?.location !== origin) errors.push(`step 1 must be at origin (${origin})`);
    if (origin && first?.traveling !== false) errors.push("step 1 must have traveling=false");
    if (finalDestination && last?.location !== finalDestination) errors.push(`step 20 must end at ${finalDestination}`);
    if (last && last.traveling !== false) errors.push("step 20 must have traveling=false");
  }

  if (errors.length > 0) {
    const err = new Error(errors.join("\n"));
    err.errors = errors;
    throw err;
  }

  return payload;
}

function buildPrompt(scenario) {
  const skills = Array.isArray(scenario?.agent?.skills_chosen) ? scenario.agent.skills_chosen : [];
  const partyMembers = Array.isArray(scenario?.party_members) ? scenario.party_members : null;

  const system = [
    "You generate in-world journey status updates for a fantasy spectator game.",
    "Return ONLY valid JSON. No markdown. No extra keys.",
    "",
    "Output schema:",
    "{",
    '  "statuses": [',
    "    {",
    '      "step": 1,',
    '      "text": "1-2 short sentences.",',
    '      "location": "one of available_locations",',
    '      "traveling": false,',
    '      "traveling_toward": "optional, only when traveling=true"',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Exactly 20 statuses, step 1..20.",
    "- Step 1: traveling=false at origin.",
    "- Step 20: traveling=false at final destination (destination or fail_destination based on outcome).",
    "- Each status must choose location from available_locations.",
    "- Use traveling=true to represent movement between locations; include traveling_toward when traveling=true.",
    "- Each text should fit in a small speech bubble; keep it short.",
    skills.length ? `- Mention these chosen skills naturally across the journey: ${skills.join(", ")}.` : "",
    partyMembers && partyMembers.length > 1 ? `- This is a party quest; occasionally mention party members: ${partyMembers.join(", ")}.` : "",
    ""
  ]
    .filter(Boolean)
    .join("\n");

  const user = JSON.stringify(
    {
      quest: scenario.quest,
      available_locations: scenario.available_locations,
      agent: scenario.agent,
      outcome: scenario.outcome,
      party_members: scenario.party_members
    },
    null,
    2
  );

  return {
    system,
    user
  };
}

async function readJsonBestEffort(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: text };
  }
}

async function callOpenRouter({ apiKey, baseUrl, model, timeoutMs, scenario }) {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const { system, user } = buildPrompt(scenario);

  const body = {
    model,
    temperature: 0.4,
    max_tokens: 1600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "x-title": "Clawcraft dev status generator"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res.ok) {
    const payload = await readJsonBestEffort(res);
    const message =
      typeof payload?.error?.message === "string" ? payload.error.message : `OpenRouter request failed (HTTP ${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.body = payload;
    throw err;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter response missing message content.");
  }
  return { content };
}

export async function generateStatusesOnce({ scenario, apiKey, baseUrl, model, timeoutMs }) {
  const { content } = await callOpenRouter({ apiKey, baseUrl, model, timeoutMs, scenario });
  const payload = extractFirstJsonObject(content);
  const validated = validateStatusPayload(payload, scenario);
  return { payload: validated, raw: content };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || args.h) {
    usage();
    return;
  }

  loadEnv();

  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v3.2";
  const timeoutMsRaw = process.env.OPENROUTER_TIMEOUT_MS;
  const timeoutMsParsed = timeoutMsRaw ? Number.parseInt(timeoutMsRaw, 10) : 25_000;
  const timeoutMs = Number.isFinite(timeoutMsParsed) ? Math.max(1_000, Math.min(120_000, timeoutMsParsed)) : 25_000;
  const retriesRaw = args.retries ? Number.parseInt(String(args.retries), 10) : 1;
  const retries = Number.isFinite(retriesRaw) ? Math.max(0, Math.min(5, retriesRaw)) : 1;

  if (!apiKey) {
    console.log("Missing OPENROUTER_API_KEY.");
    console.log("");
    usage();
    process.exitCode = 1;
    return;
  }

  let scenario = buildDefaultScenario();
  if (typeof args.input === "string") {
    const p = path.resolve(process.cwd(), args.input);
    scenario = JSON.parse(fs.readFileSync(p, "utf8"));
  }

  console.log("OpenRouter model:", model);
  console.log("");

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const out = await generateStatusesOnce({ scenario, apiKey, baseUrl, model, timeoutMs });

      console.log("OK: validated 20 statuses.");
      console.log("");
      console.log(JSON.stringify(out.payload, null, 2));

      if (typeof args.out === "string") {
        const outPath = path.resolve(process.cwd(), args.out);
        fs.writeFileSync(outPath, JSON.stringify(out.payload, null, 2));
        console.log("");
        console.log("Wrote:", outPath);
      }

      return;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`Attempt ${attempt + 1} failed:`);
      console.log(message);
      console.log("");
    }
  }

  if (lastError) {
    console.error(lastError);
  }
  process.exitCode = 1;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
