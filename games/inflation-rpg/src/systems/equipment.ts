import type { Equipment, EquipmentSlot, Inventory } from '../types';

export const SLOT_LIMITS: Record<EquipmentSlot, number> = {
  weapon: 10,
  armor: 10,
  accessory: 3,
};

function slotArray(inv: Inventory, slot: EquipmentSlot): Equipment[] {
  if (slot === 'weapon') return inv.weapons;
  if (slot === 'armor') return inv.armors;
  return inv.accessories;
}

function setSlotArray(inv: Inventory, slot: EquipmentSlot, arr: Equipment[]): Inventory {
  if (slot === 'weapon') return { ...inv, weapons: arr };
  if (slot === 'armor') return { ...inv, armors: arr };
  return { ...inv, accessories: arr };
}

export function canDrop(inv: Inventory, slot: EquipmentSlot): boolean {
  return slotArray(inv, slot).length < SLOT_LIMITS[slot];
}

export function addToInventory(inv: Inventory, item: Equipment): Inventory {
  if (!canDrop(inv, item.slot)) return inv;
  return setSlotArray(inv, item.slot, [...slotArray(inv, item.slot), item]);
}

export function removeFromInventory(inv: Inventory, itemId: string): Inventory {
  return {
    weapons: inv.weapons.filter(e => e.id !== itemId),
    armors: inv.armors.filter(e => e.id !== itemId),
    accessories: inv.accessories.filter(e => e.id !== itemId),
  };
}

export function getAllEquipped(inv: Inventory): Equipment[] {
  return [...inv.weapons, ...inv.armors, ...inv.accessories];
}

export function getEquippedItemsList(inv: Inventory, equippedItemIds: string[]): Equipment[] {
  const all = getAllEquipped(inv);
  return equippedItemIds
    .map((id) => all.find((e) => e.id === id))
    .filter((e): e is Equipment => e !== undefined);
}
