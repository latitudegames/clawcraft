import assert from "node:assert/strict";
import test from "node:test";

import { computePartyFanOutOffsets } from "./party-fanout";

function approxEqual(a: number, b: number, eps = 1e-6) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ~ ${b}`);
}

test("computePartyFanOutOffsets returns zero offset for a single member", () => {
  const offsets = computePartyFanOutOffsets(["alice"]);
  assert.deepEqual(offsets.get("alice"), { dx: 0, dy: 0 });
});

test("computePartyFanOutOffsets is deterministic by member id order", () => {
  const a = computePartyFanOutOffsets(["charlie", "alice", "bob"], { radius: 9 });
  const b = computePartyFanOutOffsets(["bob", "charlie", "alice"], { radius: 9 });
  assert.deepEqual(a, b);
});

test("computePartyFanOutOffsets places members on a fixed-radius ring", () => {
  const radius = 10;
  const offsets = computePartyFanOutOffsets(["a", "b", "c", "d"], { radius });
  const members = ["a", "b", "c", "d"];

  const values = members.map((id) => offsets.get(id)!);
  for (const value of values) {
    approxEqual(Math.hypot(value.dx, value.dy), radius, 1e-9);
  }

  const sumDx = values.reduce((sum, value) => sum + value.dx, 0);
  const sumDy = values.reduce((sum, value) => sum + value.dy, 0);
  approxEqual(sumDx, 0, 1e-9);
  approxEqual(sumDy, 0, 1e-9);
});

