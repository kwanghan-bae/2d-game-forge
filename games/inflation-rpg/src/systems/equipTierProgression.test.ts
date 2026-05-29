import { describe, it, expect } from 'vitest';
import { EQUIPMENT_BASES } from '../data/equipment';
import type { EquipmentRarity } from '../types';

describe('equipment tier progression', () => {
  const RARITY_ORDER: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  it('has equipment across multiple rarities', () => {
    const rarities = new Set(EQUIPMENT_BASES.map(e => e.rarity));
    expect(rarities.size).toBeGreaterThanOrEqual(3);
  });

  it('higher rarity equipment tends to have higher total stats (top tier > bottom tier)', () => {
    function avgFlat(rarity: EquipmentRarity): number {
      const items = EQUIPMENT_BASES.filter(e => e.rarity === rarity);
      if (items.length === 0) return 0;
      const total = items.reduce((sum, e) => {
        const flats = Object.values(e.baseStats.flat ?? {});
        return sum + flats.reduce((s, v) => s + (v ?? 0), 0);
      }, 0);
      return total / items.length;
    }

    // Top tier (epic+) should beat bottom tier (common)
    const commonAvg = avgFlat('common');
    const epicAvg = avgFlat('epic');
    const legendaryAvg = avgFlat('legendary');
    if (epicAvg > 0) expect(epicAvg).toBeGreaterThan(commonAvg);
    if (legendaryAvg > 0) expect(legendaryAvg).toBeGreaterThan(commonAvg);
  });

  it('higher rarity equipment has higher average price', () => {
    function avgPrice(rarity: EquipmentRarity): number {
      const items = EQUIPMENT_BASES.filter(e => e.rarity === rarity);
      if (items.length === 0) return 0;
      return items.reduce((sum, e) => sum + e.price, 0) / items.length;
    }

    let prevPrice = -Infinity;
    for (const rarity of RARITY_ORDER) {
      const avg = avgPrice(rarity);
      if (avg === 0) continue;
      expect(avg, `${rarity} avg price`).toBeGreaterThanOrEqual(prevPrice);
      prevPrice = avg;
    }
  });

  it('most equipment has at least one stat (accessories may be exceptions)', () => {
    const withStats = EQUIPMENT_BASES.filter(e => {
      const flatKeys = Object.keys(e.baseStats.flat ?? {});
      const pctKeys = Object.keys(e.baseStats.percent ?? {});
      return flatKeys.length + pctKeys.length > 0;
    });
    // At least 90% of equipment should have stats
    expect(withStats.length / EQUIPMENT_BASES.length).toBeGreaterThan(0.9);
  });
});
