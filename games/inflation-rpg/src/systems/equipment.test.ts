import { describe, it, expect } from 'vitest';
import {
  SLOT_LIMITS,
  canDropForBase,
  addToInventory,
  removeFromInventory,
  getAllInstances,
  getEquippedInstances,
} from './equipment';
import type { EquipmentBase, EquipmentInstance, Inventory } from '../types';

const mkWeaponBase = (id: string): EquipmentBase => ({
  id, name: id, slot: 'weapon', rarity: 'common',
  baseStats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
});

const mkInstance = (instanceId: string, baseId: string): EquipmentInstance => ({
  instanceId, baseId, enhanceLv: 0, modifiers: [],
});

const emptyInv: Inventory = { weapons: [], armors: [], accessories: [] };

describe('Equipment System', () => {
  it('SLOT_LIMITS: weapon=10, armor=10, accessory=3', () => {
    expect(SLOT_LIMITS.weapon).toBe(10);
    expect(SLOT_LIMITS.armor).toBe(10);
    expect(SLOT_LIMITS.accessory).toBe(3);
  });

  it('canDropForBase: true when slot not full', () => {
    const base = mkWeaponBase('w-knife');
    expect(canDropForBase(emptyInv, base)).toBe(true);
  });

  it('canDropForBase: false when slot at limit', () => {
    const base = mkWeaponBase('w-knife');
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkInstance(`inst${i}`, `w-knife`));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    expect(canDropForBase(inv, base)).toBe(false);
  });

  it('addToInventory: adds instance to correct slot (real baseId required)', () => {
    // Use real catalog ID so getEquipmentBase resolves
    const inst = mkInstance('inst-sword', 'w-sword');
    const result = addToInventory(emptyInv, inst);
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]?.instanceId).toBe('inst-sword');
  });

  it('addToInventory: does not add when slot full', () => {
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkInstance(`inst${i}`, 'w-sword'));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    const extra = mkInstance('inst-extra', 'w-sword');
    const result = addToInventory(inv, extra);
    expect(result.weapons).toHaveLength(10);
  });

  it('removeFromInventory: removes by instanceId', () => {
    const inst = mkInstance('inst-sword', 'w-sword');
    const inv: Inventory = { ...emptyInv, weapons: [inst] };
    const result = removeFromInventory(inv, 'inst-sword');
    expect(result.weapons).toHaveLength(0);
  });

  it('getAllInstances: combines all slots', () => {
    const inst = mkInstance('inst-w1', 'w-sword');
    const inv: Inventory = {
      weapons: [inst],
      armors: [],
      accessories: [],
    };
    expect(getAllInstances(inv)).toHaveLength(1);
  });
});

describe('getEquippedInstances', () => {
  const testSword = mkInstance('inst-sword', 'w-sword');
  const testArmor = mkInstance('inst-cloth', 'a-cloth');

  const inv: Inventory = {
    weapons: [testSword],
    armors: [testArmor],
    accessories: [],
  };

  it('returns instances matching equippedItemIds in order', () => {
    const result = getEquippedInstances(inv, ['inst-cloth', 'inst-sword']);
    expect(result).toHaveLength(2);
    expect(result[0]!.instanceId).toBe('inst-cloth');
    expect(result[1]!.instanceId).toBe('inst-sword');
  });

  it('ignores IDs not found in inventory', () => {
    expect(getEquippedInstances(inv, ['non-existent'])).toHaveLength(0);
  });

  it('returns empty array when equippedItemIds is empty', () => {
    expect(getEquippedInstances(inv, [])).toHaveLength(0);
  });
});
