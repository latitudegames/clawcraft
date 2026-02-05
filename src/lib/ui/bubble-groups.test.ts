import assert from "node:assert/strict";
import test from "node:test";

import { groupBubbleCandidates, selectBubbleGroups, type BubbleGroup } from "./bubble-groups";

test("groupBubbleCandidates groups candidates by run_id", () => {
  const groups = groupBubbleCandidates({
    candidates: [
      { username: "alice", run_id: "run1" },
      { username: "bob", run_id: "run1" },
      { username: "chris", run_id: "run2" }
    ],
    focusUsername: "bob"
  });

  assert.equal(groups.length, 2);
  const run1 = groups.find((g) => g.id === "run1");
  assert.ok(run1, "expected run1 group");
  assert.deepEqual(run1.members, ["alice", "bob"]);
  assert.equal(run1.representative, "bob");
});

test("selectBubbleGroups includes focused group first and respects limit", () => {
  const groups: BubbleGroup[] = [
    { id: "a", sortKey: "alice", members: ["alice"], representative: "alice" },
    { id: "b", sortKey: "bob", members: ["bob"], representative: "bob" },
    { id: "c", sortKey: "zoe", members: ["zoe"], representative: "zoe" }
  ];

  const selected = selectBubbleGroups({ groups, bubbleLimit: 2, focusUsername: "zoe" });
  assert.deepEqual(
    selected.map((g) => g.id),
    ["c", "a"]
  );
});

