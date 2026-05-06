import { describe, it, expect } from 'vitest';
import type { EquipmentInstance } from '../types';
import { getNextTier, getCraftCost, pickCraftResultBase, attemptCraft } from './crafting';
import { getEquipmentBase } from '../data/equipment';

describe('crafting', () => {
  it('getNextTier returns correct tier', () => {
    expect(getNextTier('common')).toBe('uncommon');
    expect(getNextTier('uncommon')).toBe('rare');
    expect(getNextTier('rare')).toBe('epic');
    expect(getNextTier('epic')).toBe('legendary');
    expect(getNextTier('legendary')).toBe('mythic');
    expect(getNextTier('mythic')).toBeNull();
  });

  it('getCraftCost increases with tier', () => {
    expect(getCraftCost('common')).toBeLessThan(getCraftCost('uncommon'));
    expect(getCraftCost('legendary')).toBeGreaterThan(getCraftCost('epic'));
  });

  it('pickCraftResultBase returns same slot + next tier', () => {
    const source = getEquipmentBase('w-knife')!;
    const result = pickCraftResultBase(source);
    expect(result?.slot).toBe('weapon');
    expect(result?.rarity).toBe('uncommon');
  });

  it('pickCraftResultBase returns null for mythic', () => {
    const source = getEquipmentBase('w-mythic-sword');
    if (source) {
      expect(pickCraftResultBase(source)).toBeNull();
    }
  });

  it('attemptCraft fails with not-enough-items', () => {
    const result = attemptCraft([], 'w-knife', 1000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-enough-items');
  });

  it('attemptCraft succeeds with 3+ instances + gold', () => {
    const items: EquipmentInstance[] = [
      { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 },
      { instanceId: 'i2', baseId: 'w-knife', enhanceLv: 0 },
      { instanceId: 'i3', baseId: 'w-knife', enhanceLv: 0 },
    ];
    const r = attemptCraft(items, 'w-knife', 1000);
    expect(r.ok).toBe(true);
    expect(r.resultBase?.rarity).toBe('uncommon');
    expect(r.result?.baseId).toBeDefined();
    expect(r.result?.enhanceLv).toBe(0);
    expect(r.cost).toBe(100);
    expect(r.consumedInstanceIds).toEqual(['i1', 'i2', 'i3']);
  });

  it('attemptCraft fails with insufficient gold', () => {
    const items: EquipmentInstance[] = [
      { instanceId: 'i1', baseId: 'w-knife', enhanceLv: 0 },
      { instanceId: 'i2', baseId: 'w-knife', enhanceLv: 0 },
      { instanceId: 'i3', baseId: 'w-knife', enhanceLv: 0 },
    ];
    const r = attemptCraft(items, 'w-knife', 50);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not-enough-gold');
  });
});
