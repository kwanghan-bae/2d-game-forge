import { describe, it, expect } from 'vitest';
import { TRAIT_CATALOG, TRAIT_IDS } from './traits';

describe('trait balance verification', () => {
  it('no trait multiplier exceeds 2.0 in any stat', () => {
    for (const id of TRAIT_IDS) {
      const trait = TRAIT_CATALOG[id];
      const mods = trait.mods;
      for (const [key, val] of Object.entries(mods)) {
        expect(val, `${id}.${key} should not exceed 2.0`).toBeLessThanOrEqual(2.0);
      }
    }
  });

  it('traits with >1.2 positive mod have a compensating negative', () => {
    for (const id of TRAIT_IDS) {
      const trait = TRAIT_CATALOG[id];
      const mods = trait.mods as Record<string, number>;
      const positives = Object.entries(mods).filter(([, v]) => v > 1.2);
      if (positives.length > 0) {
        const hasNegative = Object.values(mods).some(v => v < 1.0);
        const hasCostMul = mods.bpCostMul != null && mods.bpCostMul > 1.0;
        expect(
          hasNegative || hasCostMul,
          `${id} has strong positive (>1.2) without cost`,
        ).toBe(true);
      }
    }
  });

  it('bpCostMul never exceeds 3.0', () => {
    for (const id of TRAIT_IDS) {
      const cost = TRAIT_CATALOG[id].mods.bpCostMul;
      if (cost != null) {
        expect(cost, `${id}.bpCostMul`).toBeLessThanOrEqual(3.0);
      }
    }
  });

  it('net power score (benefits / costs) stays within 0.4-2.0 range', () => {
    for (const id of TRAIT_IDS) {
      const mods = TRAIT_CATALOG[id].mods as Record<string, number>;
      // bpCostMul > 1 is a cost, not benefit; invert it for power calc
      let score = 1;
      for (const [key, val] of Object.entries(mods)) {
        if (key === 'bpCostMul') {
          score /= val; // higher bpCost = weaker
        } else {
          score *= val;
        }
      }
      expect(score, `${id} net power`).toBeGreaterThan(0.4);
      expect(score, `${id} net power`).toBeLessThan(2.0);
    }
  });

  it('all 16 traits are present', () => {
    expect(TRAIT_IDS).toHaveLength(16);
  });
});
