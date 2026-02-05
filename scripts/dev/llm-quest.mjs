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

function usage() {
  console.log("Clawcraft OpenRouter quest narrative generator (dev)");
  console.log("");
  console.log("Generates 1 quest narrative payload (JSON) per game-design.md quest refresh flow.");
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
  console.log("  npm run dev:llm:quest");
  console.log("  node scripts/dev/llm-quest.mjs --out /tmp/quest.json");
  console.log("  node scripts/dev/llm-quest.mjs --input ./scripts/dev/quest-input.example.json");
}

export function buildDefaultScenario() {
  return {
    origin: "King's Landing",
    destinations: ["Goblin Cave", "Whispering Woods", "Ancient Library"],
    available_locations: ["King's Landing", "Goblin Cave", "Whispering Woods", "Ancient Library"],
    party_size: 1
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function extractFirstJsonObject(text) {
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
  return JSON.parse(unfenced.slice(start, end + 1));
}

function buildPrompt(scenario) {
  const partySize = Number.isFinite(scenario?.party_size) ? Math.max(1, Math.min(5, Math.floor(scenario.party_size))) : 1;
  const failRule = partySize > 1 ? "must be null" : "must be null or a valid location";

  const system = [
    "You generate fantasy RPG quests for a spectator game.",
    "Return ONLY valid JSON. No markdown. No extra keys.",
    "",
    "Output schema:",
    "{",
    '  "name": "short quest title",',
    '  "description": "1-3 sentences, flavorful but concise",',
    '  "destination": "one of destinations",',
    '  "fail_destination": "null or a location (solo quests only)",',
    '  "nearby_pois_for_journey": ["1-3 locations from available_locations"]',
    "}",
    "",
    "Rules:",
    "- destination must be one of destinations.",
    `- fail_destination ${failRule}. If present, it must not equal destination.`,
    "- nearby_pois_for_journey must have 1-3 unique entries from available_locations.",
    "- Keep name <= 80 characters and description <= 280 characters.",
    ""
  ].join("\n");

  const user = JSON.stringify(
    {
      origin: scenario.origin,
      destinations: scenario.destinations,
      available_locations: scenario.available_locations,
      party_size: partySize
    },
    null,
    2
  );

  return { system, user };
}

export function validateQuestPayload(payload, scenario) {
  const errors = [];

  if (!isObject(payload)) {
    errors.push("payload must be an object");
  }

  const name = isObject(payload) ? payload.name : undefined;
  const description = isObject(payload) ? payload.description : undefined;
  const destination = isObject(payload) ? payload.destination : undefined;
  const failDestination = isObject(payload) ? payload.fail_destination : undefined;
  const nearby = isObject(payload) ? payload.nearby_pois_for_journey : undefined;

  if (typeof name !== "string" || name.trim().length === 0) errors.push("payload.name must be a non-empty string");
  if (typeof description !== "string" || description.trim().length === 0) errors.push("payload.description must be a non-empty string");

  const allowedDestinations = new Set(Array.isArray(scenario?.destinations) ? scenario.destinations : []);
  const allowedLocations = new Set(Array.isArray(scenario?.available_locations) ? scenario.available_locations : []);

  if (typeof destination !== "string" || destination.trim().length === 0) {
    errors.push("payload.destination must be a non-empty string");
  } else if (allowedDestinations.size > 0 && !allowedDestinations.has(destination)) {
    errors.push("payload.destination must be one of scenario.destinations");
  } else if (allowedLocations.size > 0 && !allowedLocations.has(destination)) {
    errors.push("payload.destination must be one of scenario.available_locations");
  }

  const partySize = Number.isFinite(scenario?.party_size) ? Math.floor(scenario.party_size) : 1;
  if (partySize > 1) {
    if (failDestination !== null && failDestination !== undefined) {
      errors.push("payload.fail_destination must be null for party quests");
    }
  } else if (failDestination !== null && failDestination !== undefined) {
    if (typeof failDestination !== "string" || failDestination.trim().length === 0) {
      errors.push("payload.fail_destination must be a string or null");
    } else if (destination && failDestination === destination) {
      errors.push("payload.fail_destination must not equal payload.destination");
    } else if (allowedLocations.size > 0 && !allowedLocations.has(failDestination)) {
      errors.push("payload.fail_destination must be one of scenario.available_locations");
    }
  }

  if (!Array.isArray(nearby)) {
    errors.push("payload.nearby_pois_for_journey must be an array");
  } else {
    if (nearby.length < 1 || nearby.length > 3) errors.push("payload.nearby_pois_for_journey must have 1-3 items");
    for (const entry of nearby) {
      if (typeof entry !== "string" || entry.trim().length === 0) {
        errors.push("payload.nearby_pois_for_journey items must be strings");
        continue;
      }
      if (allowedLocations.size > 0 && !allowedLocations.has(entry)) {
        errors.push("payload.nearby_pois_for_journey items must be in scenario.available_locations");
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return payload;
}

export async function generateQuestOnce({ scenario, apiKey, baseUrl, model, timeoutMs, fetchImpl }) {
  const fetchFn = fetchImpl ?? fetch;
  const url = `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;
  const { system, user } = buildPrompt(scenario);

  const body = {
    model,
    temperature: 0.5,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };

  const res = await fetchFn(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res || typeof res.ok !== "boolean") {
    throw new Error("fetchImpl must return a Response-like object with ok/json().");
  }

  if (!res.ok) {
    throw new Error(`OpenRouter request failed (HTTP ${res.status ?? "?"}).`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenRouter response missing message content.");
  }

  const parsed = extractFirstJsonObject(content);
  const validated = validateQuestPayload(parsed, scenario);
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
      const out = await generateQuestOnce({ scenario, apiKey, baseUrl, model, timeoutMs });

      console.log("OK: validated quest payload.");
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
