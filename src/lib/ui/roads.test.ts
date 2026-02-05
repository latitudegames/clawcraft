import assert from "node:assert/strict";
import test from "node:test";

import { computeRoadPolyline } from "./roads";

function dot(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.x + a.y * b.y;
}

test("computeRoadPolyline returns endpoints and a perpendicular bend", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 0 };
  const out = computeRoadPolyline({ from, to, seed: "edge:a" });

  assert.equal(out.length, 3);
  assert.deepEqual(out[0], from);
  assert.deepEqual(out[2], to);

  const mid = out[1];
  assert.equal(mid.x, 5);
  assert.notEqual(mid.y, 0);

  const dir = { x: to.x - from.x, y: to.y - from.y };
  const disp = { x: mid.x - (from.x + to.x) / 2, y: mid.y - (from.y + to.y) / 2 };
  assert.ok(Math.abs(dot(dir, disp)) < 1e-6, "expected displacement perpendicular to edge direction");
});

test("computeRoadPolyline is deterministic by seed", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 0 };

  const a1 = computeRoadPolyline({ from, to, seed: "edge:a" });
  const a2 = computeRoadPolyline({ from, to, seed: "edge:a" });
  const b = computeRoadPolyline({ from, to, seed: "edge:b" });

  assert.deepEqual(a1, a2);
  assert.notDeepEqual(a1, b);
});

