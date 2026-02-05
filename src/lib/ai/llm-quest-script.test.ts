import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

type QuestScenario = {
  origin: string;
  destinations: string[];
  available_locations: string[];
  party_size: number;
};

type QuestNarrativePayload = {
  name: string;
  description: string;
  destination: string;
  fail_destination: string | null;
  nearby_pois_for_journey: string[];
};

type QuestScriptModule = {
  buildDefaultScenario: () => QuestScenario;
  validateQuestPayload: (payload: unknown, scenario: QuestScenario) => QuestNarrativePayload;
  generateQuestOnce?: (args: {
    scenario: QuestScenario;
    apiKey: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
    fetchImpl?: (url: string, init: unknown) => Promise<unknown>;
  }) => Promise<{ payload: QuestNarrativePayload; raw: string }>;
};

async function loadQuestScript(): Promise<QuestScriptModule> {
  const href = pathToFileURL(path.resolve("scripts/dev/llm-quest.mjs")).href;
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  return (await dynamicImport(href)) as QuestScriptModule;
}

function makeValidPayload(scenario: QuestScenario): QuestNarrativePayload {
  const destination = scenario.destinations[0] ?? "Goblin Cave";
  const fail = scenario.party_size > 1 ? null : scenario.destinations[1] ?? null;
  const nearby = Array.from(new Set([scenario.origin, destination, fail].filter(Boolean) as string[])).slice(0, 3);
  return {
    name: "Clear the Goblin Cave",
    description: "Goblins have been raiding caravans near the cave entrance.",
    destination,
    fail_destination: fail,
    nearby_pois_for_journey: nearby
  };
}

test("validateQuestPayload accepts a valid narrative payload", async () => {
  const mod = await loadQuestScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  assert.deepEqual(mod.validateQuestPayload(payload, scenario), payload);
});

test("validateQuestPayload rejects invalid destination", async () => {
  const mod = await loadQuestScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.destination = "Not A Real Place";
  assert.throws(() => mod.validateQuestPayload(payload, scenario));
});

test("validateQuestPayload rejects party quests with fail_destination", async () => {
  const mod = await loadQuestScript();
  const scenario = { ...mod.buildDefaultScenario(), party_size: 3 };
  const payload = makeValidPayload(scenario);
  payload.fail_destination = scenario.destinations[1] ?? scenario.destinations[0] ?? "Goblin Cave";
  assert.throws(() => mod.validateQuestPayload(payload, scenario));
});

test("validateQuestPayload rejects too many nearby_pois_for_journey", async () => {
  const mod = await loadQuestScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.nearby_pois_for_journey = ["a", "b", "c", "d"];
  assert.throws(() => mod.validateQuestPayload(payload, scenario));
});

test("generateQuestOnce returns a validated payload (no network)", async () => {
  const mod = await loadQuestScript();
  assert.equal(typeof mod.generateQuestOnce, "function");

  const scenario = mod.buildDefaultScenario();
  const expected = makeValidPayload(scenario);

  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(expected) } }]
    })
  });

  const out = await mod.generateQuestOnce!({
    scenario,
    apiKey: "test",
    baseUrl: "https://example.com",
    model: "test",
    timeoutMs: 10_000,
    fetchImpl: fakeFetch as unknown as (url: string, init: unknown) => Promise<unknown>
  });

  assert.deepEqual(out.payload, expected);
});
