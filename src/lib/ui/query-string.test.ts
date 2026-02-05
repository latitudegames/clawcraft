import assert from "node:assert/strict";
import test from "node:test";

import { setQueryParam } from "./query-string";

test("setQueryParam adds a query param when missing", () => {
  assert.equal(setQueryParam("", "agent", "codex"), "?agent=codex");
  assert.equal(setQueryParam("?x=1", "agent", "codex"), "?x=1&agent=codex");
});

test("setQueryParam replaces an existing param", () => {
  assert.equal(setQueryParam("?agent=old", "agent", "new"), "?agent=new");
});

test("setQueryParam removes a param when value is null", () => {
  assert.equal(setQueryParam("?agent=old&x=1", "agent", null), "?x=1");
  assert.equal(setQueryParam("?agent=old", "agent", null), "");
});
