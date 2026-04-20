import { describe, it, expect } from 'vitest';
import {
  SLOT_LIMITS,
  canDrop,
  addToInventory,
  removeFromInventory,
  getAllEquipped,
  getEquippedItemsList,
} from './equipment';
import type { Equipment, Inventory } from '../types';

const mkWeapon = (id: string): Equipment => ({
  id, name: id, slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 10 } }, dropAreaIds: [], price: 0,
});

const emptyInv: Inventory = { weapons: [], armors: [], accessories: [] };

describe('Equipment System', () => {
  it('SLOT_LIMITS: weapon=10, armor=10, accessory=3', () => {
    expect(SLOT_LIMITS.weapon).toBe(10);
    expect(SLOT_LIMITS.armor).toBe(10);
    expect(SLOT_LIMITS.accessory).toBe(3);
  });

  it('canDrop: true when slot not full', () => {
    expect(canDrop(emptyInv, 'weapon')).toBe(true);
  });

  it('canDrop: false when slot at limit', () => {
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkWeapon(`w${i}`));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    expect(canDrop(inv, 'weapon')).toBe(false);
  });

  it('addToInventory: adds item to correct slot', () => {
    const item = mkWeapon('sword');
    const result = addToInventory(emptyInv, item);
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]?.id).toBe('sword');
  });

  it('addToInventory: does not add when slot full', () => {
    const fullWeapons = Array.from({ length: 10 }, (_, i) => mkWeapon(`w${i}`));
    const inv: Inventory = { ...emptyInv, weapons: fullWeapons };
    const result = addToInventory(inv, mkWeapon('extra'));
    expect(result.weapons).toHaveLength(10);
  });

  it('removeFromInventory: removes by id', () => {
    const inv: Inventory = { ...emptyInv, weapons: [mkWeapon('sword')] };
    const result = removeFromInventory(inv, 'sword');
    expect(result.weapons).toHaveLength(0);
  });

  it('getAllEquipped: combines all slots', () => {
    const inv: Inventory = {
      weapons: [mkWeapon('w1')],
      armors: [],
      accessories: [],
    };
    expect(getAllEquipped(inv)).toHaveLength(1);
  });
});

const testSword: Equipment = {
  id: 'w-sword', name: '검', slot: 'weapon', rarity: 'common',
  stats: { flat: { atk: 80 } }, dropAreaIds: [], price: 300,
};
const testArmor: Equipment = {
  id: 'a-cloth', name: '갑옷', slot: 'armor', rarity: 'common',
  stats: { flat: { def: 20 } }, dropAreaIds: [], price: 150,
};

describe('getEquippedItemsList', () => {
  const inv: Inventory = {
    weapons: [testSword],
    armors: [testArmor],
    accessories: [],
  };

  it('returns items matching equippedItemIds in order', () => {
    const result = getEquippedItemsList(inv, ['a-cloth', 'w-sword']);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a-cloth');
    expect(result[1]!.id).toBe('w-sword');
  });

  it('ignores IDs not found in inventory', () => {
    expect(getEquippedItemsList(inv, ['non-existent'])).toHaveLength(0);
  });

  it('returns empty array when equippedItemIds is empty', () => {
    expect(getEquippedItemsList(inv, [])).toHaveLength(0);
  });
});
