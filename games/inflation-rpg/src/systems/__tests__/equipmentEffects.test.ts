import { describe, it, expect } from 'vitest';
import { getActiveSpecialEffects, totalBurstChanceBonus, totalGoldBonus, totalExpBonus, comboShieldThreshold } from '../equipmentEffects';
import type { EquipmentInstance } from '../../types';

describe('equipmentEffects — special effects', () => {
  it('extracts special effect from equipped item', () => {
    const equipped: EquipmentInstance[] = [
      { instanceId: '1', baseId: 'acc-burst-charm', enhanceLv: 0, modifiers: [] },
    ];
    const effects = getActiveSpecialEffects(equipped);
    expect(effects).toHaveLength(1);
    expect(effects[0]).toEqual({ type: 'burst_chance', bonus: 20 });
  });

  it('returns empty for items without special effects', () => {
    const equipped: EquipmentInstance[] = [
      { instanceId: '2', baseId: 'w-knife', enhanceLv: 0, modifiers: [] },
    ];
    expect(getActiveSpecialEffects(equipped)).toHaveLength(0);
  });

  it('totalBurstChanceBonus sums burst_chance effects', () => {
    const effects = [
      { type: 'burst_chance' as const, bonus: 20 },
      { type: 'gold_bonus' as const, percent: 15 },
    ];
    expect(totalBurstChanceBonus(effects)).toBe(20);
  });

  it('totalGoldBonus sums gold_bonus effects', () => {
    const effects = [
      { type: 'gold_bonus' as const, percent: 15 },
      { type: 'gold_bonus' as const, percent: 10 },
    ];
    expect(totalGoldBonus(effects)).toBe(25);
  });

  it('totalExpBonus sums exp_bonus effects', () => {
    const effects = [{ type: 'exp_bonus' as const, percent: 10 }];
    expect(totalExpBonus(effects)).toBe(10);
  });

  it('comboShieldThreshold returns max threshold', () => {
    const effects = [
      { type: 'combo_shield' as const, threshold: 3 },
      { type: 'combo_shield' as const, threshold: 5 },
    ];
    expect(comboShieldThreshold(effects)).toBe(5);
  });

  it('returns 0 when no effects of requested type', () => {
    expect(totalBurstChanceBonus([])).toBe(0);
    expect(comboShieldThreshold([])).toBe(0);
  });
});
