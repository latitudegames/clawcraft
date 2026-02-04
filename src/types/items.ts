import type { SkillBonuses } from "./skills";

export const EQUIPMENT_SLOTS = ["head", "chest", "legs", "boots", "right_hand", "left_hand"] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemDefinition = {
  item_id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  slot: EquipmentSlot;
  skill_bonuses: SkillBonuses;
};
