import fs from "node:fs";
import path from "node:path";

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
  console.log("Clawcraft OpenRouter LLM smoke test");
  console.log("");
  console.log("Env (set in .env / .env.local or via shell):");
  console.log("  OPENROUTER_API_KEY=...");
  console.log("  OPENROUTER_MODEL=deepseek/deepseek-v3.2");
  console.log("  OPENROUTER_BASE_URL=https://openrouter.ai/api/v1");
  console.log("");
  console.log("Examples:");
  console.log("  npm run dev:llm");
  console.log("  OPENROUTER_MODEL=deepseek/deepseek-v3.2 npm run dev:llm");
}

async function readJsonBestEffort(res) {
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

  loadEnv();

  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v3.2";

  if (!apiKey) {
    console.log("Missing OPENROUTER_API_KEY.");
    console.log("");
    usage();
    process.exitCode = 1;
    return;
  }

  const url = `${baseUrl}/chat/completions`;
  const body = {
    model,
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return a single JSON object with keys: ok (boolean), message (string). No markdown." },
      { role: "user", content: "Say hello from Clawcraft and include the chosen model id." }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "x-title": "Clawcraft dev smoke"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000)
  });

  if (!res.ok) {
    const payload = await readJsonBestEffort(res);
    console.log("OpenRouter call failed:", res.status);
    console.log(payload);
    process.exitCode = 1;
    return;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  console.log("OpenRouter model:", model);
  console.log("Raw content:");
  console.log(content);
  console.log("");

  try {
    console.log("Parsed JSON:");
    console.log(JSON.parse(content));
  } catch {
    console.log("Could not parse JSON from content.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

