import type { ItemDefinition, EquipmentSlot } from "../../types/items";
import type { SkillBonuses } from "../../types/skills";

export type InventoryState = Record<string, number>;
export type EquipmentState = Partial<Record<EquipmentSlot, string>>;

function cloneInventory(inventory: InventoryState): InventoryState {
  const out: InventoryState = {};
  for (const [itemId, qty] of Object.entries(inventory)) {
    if (!Number.isInteger(qty) || qty < 0) throw new Error(`Invalid inventory quantity for '${itemId}': ${String(qty)}`);
    if (qty === 0) continue;
    out[itemId] = qty;
  }
  return out;
}

export function applyEquipmentChanges(args: {
  inventory: InventoryState;
  equipment: EquipmentState;
  itemsById: Record<string, ItemDefinition>;
  equip?: Partial<Record<EquipmentSlot, string>>;
  unequip?: EquipmentSlot[];
}): { inventory: InventoryState; equipment: EquipmentState } {
  const inventory = cloneInventory(args.inventory);
  const equipment: EquipmentState = { ...args.equipment };

  const unequip = args.unequip ?? [];
  const equip = args.equip ?? {};

  const equipSlotKeys = new Set(Object.keys(equip));
  for (const slot of unequip) {
    if (equipSlotKeys.has(slot)) {
      throw new Error(`Slot '${slot}' cannot be both equipped and unequipped in the same action`);
    }
  }

  for (const slot of unequip) {
    const equippedItemId = equipment[slot];
    if (!equippedItemId) continue;
    delete equipment[slot];
    inventory[equippedItemId] = (inventory[equippedItemId] ?? 0) + 1;
  }

  for (const [slot, itemId] of Object.entries(equip) as [EquipmentSlot, string][]) {
    if (!itemId) continue;
    const item = args.itemsById[itemId];
    if (!item) throw new Error(`Unknown item: ${itemId}`);
    if (item.slot !== slot) throw new Error(`Item '${itemId}' cannot be equipped in slot '${slot}' (item.slot=${item.slot})`);

    const currentlyEquipped = equipment[slot];
    if (currentlyEquipped === itemId) continue;

    const invQty = inventory[itemId] ?? 0;
    if (invQty <= 0) throw new Error(`Item '${itemId}' is not in inventory`);

    if (currentlyEquipped) {
      inventory[currentlyEquipped] = (inventory[currentlyEquipped] ?? 0) + 1;
    }

    if (invQty === 1) delete inventory[itemId];
    else inventory[itemId] = invQty - 1;

    equipment[slot] = itemId;
  }

  return { inventory, equipment };
}

export function getEquipmentSkillBonuses(args: { equipment: EquipmentState; itemsById: Record<string, ItemDefinition> }): SkillBonuses {
  const out: Record<string, number> = {};

  for (const itemId of Object.values(args.equipment)) {
    if (!itemId) continue;
    const item = args.itemsById[itemId];
    if (!item) throw new Error(`Unknown equipped item: ${itemId}`);

    for (const [skill, bonus] of Object.entries(item.skill_bonuses)) {
      if (typeof bonus !== "number" || !Number.isFinite(bonus) || bonus === 0) continue;
      out[skill] = (out[skill] ?? 0) + bonus;
    }
  }

  return out as SkillBonuses;
}

