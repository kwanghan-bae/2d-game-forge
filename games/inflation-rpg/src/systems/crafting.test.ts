import { describe, it, expect } from 'vitest';
import { getNextTier, getCraftCost, pickCraftResult, attemptCraft } from './crafting';
import { getEquipmentById } from '../data/equipment';

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

  it('pickCraftResult returns same slot + next tier', () => {
    const source = getEquipmentById('w-knife')!;
    const result = pickCraftResult(source);
    expect(result?.slot).toBe('weapon');
    expect(result?.rarity).toBe('uncommon');
  });

  it('pickCraftResult returns null for mythic', () => {
    const source = getEquipmentById('w-mythic-sword');
    if (source) {
      expect(pickCraftResult(source)).toBeNull();
    }
  });

  it('attemptCraft fails with not-enough-items', () => {
    const result = attemptCraft([], 'w-knife', 1000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-enough-items');
  });

  it('attemptCraft succeeds with 3+ items + gold', () => {
    const knife = getEquipmentById('w-knife')!;
    const result = attemptCraft([knife, knife, knife], 'w-knife', 1000);
    expect(result.ok).toBe(true);
    expect(result.result?.rarity).toBe('uncommon');
    expect(result.cost).toBe(100);
  });

  it('attemptCraft fails with insufficient gold', () => {
    const knife = getEquipmentById('w-knife')!;
    const result = attemptCraft([knife, knife, knife], 'w-knife', 50);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-enough-gold');
  });
});
