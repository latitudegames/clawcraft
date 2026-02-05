import assert from "node:assert/strict";
import test from "node:test";

import type { ItemDefinition } from "../../types/items";
import { applyEquipmentChanges, getEquipmentSkillBonuses } from "./equipment";

const ITEMS: Record<string, ItemDefinition> = {
  item_iron_helm: {
    item_id: "item_iron_helm",
    name: "Iron Helm",
    description: "A sturdy helm with a few dents from past brawls.",
    rarity: "common",
    slot: "head",
    skill_bonuses: { melee: 1 }
  },
  item_gold_helm: {
    item_id: "item_gold_helm",
    name: "Gold Helm",
    description: "Shiny enough to attract trouble.",
    rarity: "rare",
    slot: "head",
    skill_bonuses: { persuasion: 2 }
  },
  item_shadow_cloak: {
    item_id: "item_shadow_cloak",
    name: "Shadow Cloak",
    description: "A cloak that drinks in lantern light.",
    rarity: "rare",
    slot: "chest",
    skill_bonuses: { stealth: 3, deception: 3 }
  },
  item_boots_silence: {
    item_id: "item_boots_silence",
    name: "Boots of Silence",
    description: "Soft soles that refuse to squeak.",
    rarity: "rare",
    slot: "boots",
    skill_bonuses: { stealth: 2, lockpicking: 1 }
  }
};

test("applyEquipmentChanges equips item from inventory into slot", () => {
  const next = applyEquipmentChanges({
    inventory: { item_shadow_cloak: 1 },
    equipment: {},
    itemsById: ITEMS,
    equip: { chest: "item_shadow_cloak" }
  });

  assert.deepEqual(next.inventory, {});
  assert.deepEqual(next.equipment, { chest: "item_shadow_cloak" });
});

test("applyEquipmentChanges replaces equipped item and returns old item to inventory", () => {
  const next = applyEquipmentChanges({
    inventory: { item_gold_helm: 1 },
    equipment: { head: "item_iron_helm" },
    itemsById: ITEMS,
    equip: { head: "item_gold_helm" }
  });

  assert.deepEqual(next.equipment, { head: "item_gold_helm" });
  assert.deepEqual(next.inventory, { item_iron_helm: 1 });
});

test("applyEquipmentChanges unequips items and moves them to inventory", () => {
  const next = applyEquipmentChanges({
    inventory: {},
    equipment: { boots: "item_boots_silence" },
    itemsById: ITEMS,
    unequip: ["boots"]
  });

  assert.deepEqual(next.equipment, {});
  assert.deepEqual(next.inventory, { item_boots_silence: 1 });
});

test("applyEquipmentChanges rejects equipping an item that is not in inventory", () => {
  assert.throws(() => {
    applyEquipmentChanges({
      inventory: {},
      equipment: {},
      itemsById: ITEMS,
      equip: { chest: "item_shadow_cloak" }
    });
  });
});

test("applyEquipmentChanges rejects slot mismatch", () => {
  assert.throws(() => {
    applyEquipmentChanges({
      inventory: { item_shadow_cloak: 1 },
      equipment: {},
      itemsById: ITEMS,
      equip: { head: "item_shadow_cloak" }
    });
  });
});

test("getEquipmentSkillBonuses aggregates bonuses across equipped items", () => {
  const bonuses = getEquipmentSkillBonuses({ equipment: { head: "item_iron_helm", chest: "item_shadow_cloak" }, itemsById: ITEMS });
  assert.deepEqual(bonuses, { melee: 1, stealth: 3, deception: 3 });
});

