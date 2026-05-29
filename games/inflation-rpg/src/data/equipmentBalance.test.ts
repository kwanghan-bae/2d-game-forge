import { describe, it, expect } from 'vitest';
import { EQUIPMENT_BASES } from './equipment';

describe('Equipment stat balance', () => {
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  it('higher rarity weapons have stronger total stats', () => {
    const weapons = EQUIPMENT_BASES.filter(e => e.slot === 'weapon');
    const byRarity = new Map<string, number[]>();
    for (const w of weapons) {
      const flat = Object.values(w.baseStats.flat ?? {}).reduce((a, b) => a + b, 0);
      const pct = Object.values(w.baseStats.percent ?? {}).reduce((a, b) => a + b, 0);
      const power = flat + pct * 2; // pct stats weighted higher
      const r = w.rarity;
      if (!byRarity.has(r)) byRarity.set(r, []);
      byRarity.get(r)!.push(power);
    }
    const avgByRarity = [...byRarity.entries()]
      .map(([r, vals]) => ({ r, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => rarityOrder.indexOf(a.r) - rarityOrder.indexOf(b.r));
    for (let i = 1; i < avgByRarity.length; i++) {
      expect(avgByRarity[i]!.avg, `${avgByRarity[i]!.r} > ${avgByRarity[i-1]!.r}`).toBeGreaterThan(avgByRarity[i-1]!.avg);
    }
  });

  it('all equipment has at least one stat or special property', () => {
    for (const eq of EQUIPMENT_BASES) {
      const hasFlat = Object.keys(eq.baseStats.flat ?? {}).length > 0;
      const hasPct = Object.keys(eq.baseStats.percent ?? {}).length > 0;
      const isAccessory = eq.slot === 'accessory'; // some accessories have no stats but give BP
      expect(hasFlat || hasPct || isAccessory, `${eq.id} should have stats`).toBe(true);
    }
  });

  it('price scales with rarity', () => {
    const priceByRarity = new Map<string, number[]>();
    for (const eq of EQUIPMENT_BASES) {
      if (!priceByRarity.has(eq.rarity)) priceByRarity.set(eq.rarity, []);
      priceByRarity.get(eq.rarity)!.push(eq.price);
    }
    const avgPrices = [...priceByRarity.entries()]
      .map(([r, prices]) => ({ r, avg: prices.reduce((a, b) => a + b, 0) / prices.length }))
      .sort((a, b) => rarityOrder.indexOf(a.r) - rarityOrder.indexOf(b.r));
    for (let i = 1; i < avgPrices.length; i++) {
      expect(avgPrices[i]!.avg, `${avgPrices[i]!.r} price > ${avgPrices[i-1]!.r}`).toBeGreaterThan(avgPrices[i-1]!.avg);
    }
  });

  it('slot distribution is balanced (each slot has ≥3 items)', () => {
    const slotCounts = new Map<string, number>();
    for (const eq of EQUIPMENT_BASES) {
      slotCounts.set(eq.slot, (slotCounts.get(eq.slot) ?? 0) + 1);
    }
    for (const [slot, count] of slotCounts) {
      expect(count, `${slot} count`).toBeGreaterThanOrEqual(3);
    }
  });
});
