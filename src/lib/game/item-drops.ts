import type { ItemRarity } from "../../types/items";

export type ItemDropConfig = {
  dropChance: number;
  rarityWeights: Array<{ rarity: ItemRarity; weight: number }>;
};

const RARITY_ORDER: ItemRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function itemDropConfigForChallengeRating(challengeRating: number): ItemDropConfig {
  if (!Number.isFinite(challengeRating) || challengeRating < 0) {
    throw new Error("challengeRating must be a finite number >= 0");
  }

  // Per game-design.md "Item Drops by Challenge Rating". We clamp to the nearest bracket.
  if (challengeRating < 25) {
    return {
      dropChance: 0.2,
      rarityWeights: [
        { rarity: "common", weight: 0.8 },
        { rarity: "uncommon", weight: 0.2 }
      ]
    };
  }

  if (challengeRating < 50) {
    return {
      dropChance: 0.35,
      rarityWeights: [
        { rarity: "common", weight: 0.5 },
        { rarity: "uncommon", weight: 0.4 },
        { rarity: "rare", weight: 0.1 }
      ]
    };
  }

  if (challengeRating < 80) {
    return {
      dropChance: 0.5,
      rarityWeights: [
        { rarity: "common", weight: 0.2 },
        { rarity: "uncommon", weight: 0.4 },
        { rarity: "rare", weight: 0.3 },
        { rarity: "epic", weight: 0.1 }
      ]
    };
  }

  if (challengeRating < 120) {
    return {
      dropChance: 0.65,
      rarityWeights: [
        { rarity: "uncommon", weight: 0.1 },
        { rarity: "rare", weight: 0.4 },
        { rarity: "epic", weight: 0.35 },
        { rarity: "legendary", weight: 0.15 }
      ]
    };
  }

  return {
    dropChance: 0.8,
    rarityWeights: [
      { rarity: "rare", weight: 0.2 },
      { rarity: "epic", weight: 0.4 },
      { rarity: "legendary", weight: 0.4 }
    ]
  };
}

export function rollItemRarity(args: { challengeRating: number; dropRoll: number; rarityRoll: number }): ItemRarity | null {
  const config = itemDropConfigForChallengeRating(args.challengeRating);

  if (!Number.isFinite(args.dropRoll)) throw new Error("dropRoll must be a finite number");
  if (!Number.isFinite(args.rarityRoll)) throw new Error("rarityRoll must be a finite number");

  const dropRoll = clamp(args.dropRoll, 0, 1);
  if (dropRoll > config.dropChance) return null;

  const pickRoll = clamp(args.rarityRoll, 0, 1);
  let cumulative = 0;
  for (const row of config.rarityWeights) {
    cumulative += row.weight;
    if (pickRoll <= cumulative) return row.rarity;
  }

  // Floating point safety: return the last rarity if we slightly exceeded.
  return config.rarityWeights.at(-1)?.rarity ?? null;
}

export function pickItemIdForDrop(args: {
  itemsByRarity: Record<ItemRarity, readonly string[]>;
  preferredRarity: ItemRarity;
  roll: number;
}): string | null {
  if (!Number.isFinite(args.roll)) throw new Error("roll must be a finite number");

  const rarityIndex = RARITY_ORDER.indexOf(args.preferredRarity);
  if (rarityIndex < 0) throw new Error(`Unknown rarity: ${args.preferredRarity}`);

  const roll = clamp(args.roll, 0, 1);

  const chooseFrom = (items: readonly string[]) => {
    if (items.length === 0) return null;
    const idx = Math.min(items.length - 1, Math.floor(roll * items.length));
    return items[idx] ?? null;
  };

  // Prefer the requested rarity, then fall back downward, then upward.
  for (let i = rarityIndex; i >= 0; i--) {
    const picked = chooseFrom(args.itemsByRarity[RARITY_ORDER[i]] ?? []);
    if (picked) return picked;
  }
  for (let i = rarityIndex + 1; i < RARITY_ORDER.length; i++) {
    const picked = chooseFrom(args.itemsByRarity[RARITY_ORDER[i]] ?? []);
    if (picked) return picked;
  }

  return null;
}

