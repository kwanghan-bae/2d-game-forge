import { describe, it, expect } from 'vitest';
import { EQUIPMENT_BASES } from '../data/equipment';
import { getCraftCost, getNextTier } from './crafting';
import type { EquipmentRarity } from '../types';

/**
 * Cycle 29 — Balance: 합성 경제성 검증
 * 합성(3→1 tier up) 시 비용 대비 스탯 진보가 적절한지 시뮬레이션.
 */

const RARITIES: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function avgPrice(rarity: EquipmentRarity): number {
  const items = EQUIPMENT_BASES.filter(e => e.rarity === rarity);
  if (items.length === 0) return 0;
  return items.reduce((sum, e) => sum + e.price, 0) / items.length;
}

function totalStatPower(rarity: EquipmentRarity): number {
  const items = EQUIPMENT_BASES.filter(e => e.rarity === rarity);
  if (items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    const flat = item.baseStats.flat ?? {};
    const pct = item.baseStats.percent ?? {};
    total += Object.values(flat).reduce((s, v) => s + v, 0);
    total += Object.values(pct).reduce((s, v) => s + v, 0);
  }
  return total / items.length;
}

describe('craft economy balance', () => {
  it('every tier-up gives stat improvement (next tier avgPower > current)', () => {
    for (const rarity of RARITIES) {
      const nextTier = getNextTier(rarity);
      if (!nextTier) continue;
      const currentPower = totalStatPower(rarity);
      const nextPower = totalStatPower(nextTier);
      expect(nextPower).toBeGreaterThan(currentPower);
    }
  });

  it('craft fee scales monotonically with tier', () => {
    for (let i = 0; i < RARITIES.length - 1; i++) {
      const lower = getCraftCost(RARITIES[i]!);
      const higher = getCraftCost(RARITIES[i + 1]!);
      expect(higher).toBeGreaterThan(lower);
    }
  });

  it('tier-up price multiplier stays within 1x-10x range', () => {
    for (const rarity of RARITIES) {
      const nextTier = getNextTier(rarity);
      if (!nextTier) continue;
      const current = avgPrice(rarity);
      const next = avgPrice(nextTier);
      if (current === 0) continue;
      const multiplier = next / current;
      expect(multiplier).toBeGreaterThanOrEqual(1);
      expect(multiplier).toBeLessThanOrEqual(10);
    }
  });

  it('core slots (weapon, armor) have full craft paths from common to legendary', () => {
    const coreSlots = ['weapon', 'armor'] as const;
    for (const slot of coreSlots) {
      for (const rarity of RARITIES) {
        const nextTier = getNextTier(rarity);
        if (!nextTier) continue;
        const sources = EQUIPMENT_BASES.filter(e => e.slot === slot && e.rarity === rarity);
        const targets = EQUIPMENT_BASES.filter(e => e.slot === slot && e.rarity === nextTier);
        if (sources.length > 0) {
          expect(targets.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

