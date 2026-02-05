import assert from "node:assert/strict";
import test from "node:test";

import { computeClusterOffsets } from "./cluster-layout";

function approxEqual(a: number, b: number, eps = 1e-6) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ~ ${b}`);
}

test("computeClusterOffsets returns zero offsets for non-overlapping points", () => {
  const offsets = computeClusterOffsets([
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 10, y: 10 }
  ]);

  assert.deepEqual(offsets.get("a"), { dx: 0, dy: 0 });
  assert.deepEqual(offsets.get("b"), { dx: 0, dy: 0 });
});

test("computeClusterOffsets clusters overlapping points deterministically", () => {
  const offsets = computeClusterOffsets(
    [
      { id: "alice", x: 5, y: 5 },
      { id: "bob", x: 5, y: 5 }
    ],
    { radius: 10 }
  );

  const a = offsets.get("alice");
  const b = offsets.get("bob");
  assert.ok(a && b);
  assert.ok(a.dx !== 0 || a.dy !== 0);
  assert.ok(b.dx !== 0 || b.dy !== 0);
  approxEqual(a.dx, -b.dx);
  approxEqual(a.dy, -b.dy);
});

test("computeClusterOffsets places N points on a circle with zero centroid", () => {
  const points = [
    { id: "a", x: 1, y: 2 },
    { id: "b", x: 1, y: 2 },
    { id: "c", x: 1, y: 2 }
  ];
  const radius = 8;
  const offsets = computeClusterOffsets(points, { radius });

  const out = points.map((p) => offsets.get(p.id)!);
  assert.equal(out.length, 3);

  const magnitudes = out.map((o) => Math.hypot(o.dx, o.dy));
  for (const m of magnitudes) approxEqual(m, radius, 1e-9);

  const sumDx = out.reduce((s, o) => s + o.dx, 0);
  const sumDy = out.reduce((s, o) => s + o.dy, 0);
  approxEqual(sumDx, 0, 1e-9);
  approxEqual(sumDy, 0, 1e-9);
});

