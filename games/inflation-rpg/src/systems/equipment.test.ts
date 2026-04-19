import { describe, it, expect } from 'vitest';
import {
  SLOT_LIMITS,
  canDrop,
  addToInventory,
  removeFromInventory,
  getAllEquipped,
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
