import test from "node:test";
import assert from "node:assert/strict";

import { extractFirstJsonObject, OpenRouterError } from "./openrouter";

test("extractFirstJsonObject parses a raw JSON object", () => {
  const out = extractFirstJsonObject('{ "ok": true, "n": 2 }');
  assert.deepEqual(out, { ok: true, n: 2 });
});

test("extractFirstJsonObject parses fenced JSON", () => {
  const out = extractFirstJsonObject("```json\n{\"hello\":\"world\"}\n```");
  assert.deepEqual(out, { hello: "world" });
});

test("extractFirstJsonObject extracts the first JSON object from surrounding text", () => {
  const out = extractFirstJsonObject("Here you go:\n\n{ \"a\": 1 }\n\nThanks!");
  assert.deepEqual(out, { a: 1 });
});

test("extractFirstJsonObject throws when no JSON object is present", () => {
  assert.throws(() => extractFirstJsonObject("nope"), (err) => err instanceof OpenRouterError);
});

