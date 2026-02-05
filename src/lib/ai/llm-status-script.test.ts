import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

type StatusScenario = {
  quest: { origin: string; destination: string; fail_destination?: string | null };
  available_locations: string[];
  agent: { username: string; skills_chosen: string[]; custom_action: string };
  outcome: "success" | "partial" | "failure";
  party_members: string[] | null;
};

type StatusEntry = {
  step: number;
  text: string;
  location: string;
  traveling: boolean;
  traveling_toward?: string;
};

type StatusPayload = { statuses: StatusEntry[] };

type StatusScriptModule = {
  buildDefaultScenario: () => StatusScenario;
  validateStatusPayload: (payload: unknown, scenario: StatusScenario) => StatusPayload;
};

async function loadStatusScript(): Promise<StatusScriptModule> {
  const href = pathToFileURL(path.resolve("scripts/dev/llm-status.mjs")).href;
  // TypeScript compiles `import()` to `require()` under `module=CommonJS`, which breaks
  // for file:// specifiers. Force a real dynamic import at runtime.
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  return (await dynamicImport(href)) as StatusScriptModule;
}

function makeValidPayload(scenario: Pick<StatusScenario, "quest" | "available_locations">): StatusPayload {
  const origin = scenario.quest.origin;
  const destination = scenario.quest.destination;
  const mid = scenario.available_locations[0] ?? origin;

  return {
    statuses: Array.from({ length: 20 }, (_v, i): StatusEntry => {
      const step = i + 1;
      const isFirst = step === 1;
      const isLast = step === 20;
      const traveling = !isFirst && !isLast && step % 2 === 0;
      const location = isFirst ? origin : isLast ? destination : mid;
      return {
        step,
        text: `Step ${step}.`,
        location,
        traveling,
        ...(traveling ? { traveling_toward: destination } : {})
      };
    })
  };
}

test("validateStatusPayload accepts a valid 20-step payload", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  assert.equal(mod.validateStatusPayload(payload, scenario), payload);
});

test("validateStatusPayload rejects wrong count", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.statuses.pop();
  assert.throws(() => mod.validateStatusPayload(payload, scenario));
});

test("validateStatusPayload rejects duplicate steps", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.statuses[1].step = 1;
  assert.throws(() => mod.validateStatusPayload(payload, scenario));
});

test("validateStatusPayload rejects invalid location", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.statuses[3].location = "Not A Real Place";
  assert.throws(() => mod.validateStatusPayload(payload, scenario));
});

test("validateStatusPayload rejects traveling=true without traveling_toward", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.statuses[5].traveling = true;
  delete (payload.statuses[5] as { traveling_toward?: string }).traveling_toward;
  assert.throws(() => mod.validateStatusPayload(payload, scenario));
});

test("validateStatusPayload rejects traveling=false with traveling_toward", async () => {
  const mod = await loadStatusScript();
  const scenario = mod.buildDefaultScenario();
  const payload = makeValidPayload(scenario);
  payload.statuses[4].traveling = false;
  (payload.statuses[4] as { traveling_toward?: string }).traveling_toward = scenario.quest.destination;
  assert.throws(() => mod.validateStatusPayload(payload, scenario));
});
