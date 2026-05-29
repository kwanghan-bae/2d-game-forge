import { describe, it, expect } from 'vitest';
import { calcDamageReduction, calcCritChance } from './stats';

describe('defense scaling', () => {
  it('damage reduction is monotonically increasing', () => {
    let prev = 0;
    for (let def = 0; def <= 10000; def += 100) {
      const dr = calcDamageReduction(def);
      expect(dr, `DR at DEF=${def}`).toBeGreaterThanOrEqual(prev);
      prev = dr;
    }
  });

  it('damage reduction never reaches 100%', () => {
    // Even at absurdly high DEF, DR < 1
    expect(calcDamageReduction(1_000_000)).toBeLessThan(1);
    expect(calcDamageReduction(100_000)).toBeLessThan(1);
  });

  it('DR has diminishing returns (concave curve)', () => {
    // Gain from 0→500 should be larger than 500→1000
    const gain1 = calcDamageReduction(500) - calcDamageReduction(0);
    const gain2 = calcDamageReduction(1000) - calcDamageReduction(500);
    expect(gain1).toBeGreaterThan(gain2);
  });

  it('50% DR at DEF=500 (formula sanity)', () => {
    expect(calcDamageReduction(500)).toBeCloseTo(0.5, 5);
  });

  it('crit chance is capped at 95%', () => {
    expect(calcCritChance(99999, 99999)).toBeLessThanOrEqual(0.95);
  });

  it('crit chance increases with AGI and LUC', () => {
    const base = calcCritChance(0, 0);
    const withAgi = calcCritChance(100, 0);
    const withBoth = calcCritChance(100, 100);
    expect(withAgi).toBeGreaterThan(base);
    expect(withBoth).toBeGreaterThan(withAgi);
  });
});
