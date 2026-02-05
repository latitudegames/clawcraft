import assert from "node:assert/strict";
import test from "node:test";

import { layoutBubbles } from "./bubble-layout";

function overlaps(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test("layoutBubbles stacks overlapping bubbles vertically", () => {
  const out = layoutBubbles({
    viewport: { width: 400, height: 300 },
    bubbles: [
      { id: "focused", anchorX: 200, anchorY: 220, width: 180, height: 64, priority: 10 },
      { id: "other", anchorX: 200, anchorY: 220, width: 180, height: 64 }
    ]
  });

  const focused = out.find((b) => b.id === "focused");
  const other = out.find((b) => b.id === "other");

  assert.ok(focused, "expected focused bubble");
  assert.ok(other, "expected other bubble");
  assert.equal(overlaps(focused.rect, other.rect), false);
  assert.ok(other.top < focused.top, "expected other bubble to move upward");
});

test("layoutBubbles clamps bubbles inside viewport", () => {
  const out = layoutBubbles({
    viewport: { width: 240, height: 120 },
    bubbles: [{ id: "a", anchorX: -50, anchorY: -50, width: 180, height: 64 }]
  });

  const bubble = out[0];
  assert.ok(bubble.rect.left >= 0, "left should be >= 0");
  assert.ok(bubble.rect.top >= 0, "top should be >= 0");
  assert.ok(bubble.rect.right <= 240, "right should be <= viewport width");
  assert.ok(bubble.rect.bottom <= 120, "bottom should be <= viewport height");
});

