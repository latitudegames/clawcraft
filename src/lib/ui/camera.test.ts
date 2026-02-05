import assert from "node:assert/strict";
import test from "node:test";

import { computeCenterTransform, computeFitTransform } from "./camera";

test("computeFitTransform centers bounds with padding", () => {
  const t = computeFitTransform({
    viewport: { width: 1000, height: 500 },
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    padding: 50
  });

  assert.equal(Number(t.scale.toFixed(4)), Number((4).toFixed(4)));
  assert.equal(Number(t.x.toFixed(1)), 300.0);
  assert.equal(Number(t.y.toFixed(1)), 50.0);
});

test("computeFitTransform handles single-point bounds", () => {
  const t = computeFitTransform({
    viewport: { width: 800, height: 600 },
    bounds: { minX: 10, minY: 20, maxX: 10, maxY: 20 },
    padding: 40
  });

  assert.equal(t.scale, 1);
  assert.equal(t.x, 800 / 2 - 10);
  assert.equal(t.y, 600 / 2 - 20);
});

test("computeCenterTransform centers a world point in the viewport", () => {
  const t = computeCenterTransform({
    viewport: { width: 800, height: 600 },
    world: { x: 100, y: 50 },
    scale: 2
  });

  assert.equal(t.scale, 2);
  assert.equal(t.x, 800 / 2 - 100 * 2);
  assert.equal(t.y, 600 / 2 - 50 * 2);
});
