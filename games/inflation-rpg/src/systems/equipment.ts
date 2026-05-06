import type { EquipmentInstance, EquipmentBase, EquipmentSlot, Inventory } from '../types';
import { getEquipmentBase } from '../data/equipment';

export const SLOT_LIMITS: Record<EquipmentSlot, number> = {
  weapon: 10,
  armor: 10,
  accessory: 3,
};

function slotArray(inv: Inventory, slot: EquipmentSlot): EquipmentInstance[] {
  if (slot === 'weapon') return inv.weapons;
  if (slot === 'armor') return inv.armors;
  return inv.accessories;
}

function setSlotArray(inv: Inventory, slot: EquipmentSlot, arr: EquipmentInstance[]): Inventory {
  if (slot === 'weapon') return { ...inv, weapons: arr };
  if (slot === 'armor') return { ...inv, armors: arr };
  return { ...inv, accessories: arr };
}

export function canDropForBase(inv: Inventory, base: EquipmentBase): boolean {
  return slotArray(inv, base.slot).length < SLOT_LIMITS[base.slot];
}

export function addToInventory(inv: Inventory, instance: EquipmentInstance): Inventory {
  const base = getEquipmentBase(instance.baseId);
  if (!base) return inv;
  if (!canDropForBase(inv, base)) return inv;
  return setSlotArray(inv, base.slot, [...slotArray(inv, base.slot), instance]);
}

export function removeFromInventory(inv: Inventory, instanceId: string): Inventory {
  return {
    weapons:     inv.weapons.filter(e => e.instanceId !== instanceId),
    armors:      inv.armors.filter(e => e.instanceId !== instanceId),
    accessories: inv.accessories.filter(e => e.instanceId !== instanceId),
  };
}

export function getAllInstances(inv: Inventory): EquipmentInstance[] {
  return [...inv.weapons, ...inv.armors, ...inv.accessories];
}

export function getEquippedInstances(inv: Inventory, equippedItemIds: string[]): EquipmentInstance[] {
  const all = getAllInstances(inv);
  return equippedItemIds
    .map((id) => all.find((e) => e.instanceId === id))
    .filter((e): e is EquipmentInstance => e !== undefined);
}
