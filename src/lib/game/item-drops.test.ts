import assert from "node:assert/strict";
import test from "node:test";

import { itemDropConfigForChallengeRating, pickItemIdForDrop } from "./item-drops";

test("itemDropConfigForChallengeRating matches spec brackets", () => {
  assert.deepEqual(itemDropConfigForChallengeRating(20), {
    dropChance: 0.2,
    rarityWeights: [
      { rarity: "common", weight: 0.8 },
      { rarity: "uncommon", weight: 0.2 }
    ]
  });

  assert.deepEqual(itemDropConfigForChallengeRating(30), {
    dropChance: 0.35,
    rarityWeights: [
      { rarity: "common", weight: 0.5 },
      { rarity: "uncommon", weight: 0.4 },
      { rarity: "rare", weight: 0.1 }
    ]
  });

  assert.deepEqual(itemDropConfigForChallengeRating(60), {
    dropChance: 0.5,
    rarityWeights: [
      { rarity: "common", weight: 0.2 },
      { rarity: "uncommon", weight: 0.4 },
      { rarity: "rare", weight: 0.3 },
      { rarity: "epic", weight: 0.1 }
    ]
  });

  assert.deepEqual(itemDropConfigForChallengeRating(100), {
    dropChance: 0.65,
    rarityWeights: [
      { rarity: "uncommon", weight: 0.1 },
      { rarity: "rare", weight: 0.4 },
      { rarity: "epic", weight: 0.35 },
      { rarity: "legendary", weight: 0.15 }
    ]
  });

  assert.deepEqual(itemDropConfigForChallengeRating(150), {
    dropChance: 0.8,
    rarityWeights: [
      { rarity: "rare", weight: 0.2 },
      { rarity: "epic", weight: 0.4 },
      { rarity: "legendary", weight: 0.4 }
    ]
  });
});

test("pickItemIdForDrop falls back when rarity has no items", () => {
  const itemsByRarity = {
    common: ["c1"],
    uncommon: [],
    rare: ["r1", "r2"],
    epic: [],
    legendary: []
  } as const;

  assert.equal(pickItemIdForDrop({ itemsByRarity, preferredRarity: "uncommon", roll: 0.9 }), "c1");
  assert.equal(pickItemIdForDrop({ itemsByRarity, preferredRarity: "epic", roll: 0.0 }), "r1");
  assert.equal(pickItemIdForDrop({ itemsByRarity, preferredRarity: "rare", roll: 0.99 }), "r2");
});

