import { describe, test, expect } from 'vitest';
import { getHealBreakdown, type HealBreakdownEntry } from '../HealBreakdownBadgeLogic';

describe('HealBreakdownBadgeLogic', () => {
  test('filters out zero-amount sources', () => {
    const result = getHealBreakdown({
      regenHeal: 10,
      lifestealHeal: 0,
      overkillHeal: 0,
      survivalHeal: 0,
      totalHeal: 10,
    });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('재생');
  });

  test('returns all 4 sources when nonzero', () => {
    const result = getHealBreakdown({
      regenHeal: 10,
      lifestealHeal: 5,
      overkillHeal: 20,
      survivalHeal: 30,
      totalHeal: 65,
    });
    expect(result).toHaveLength(4);
    const sources = result.map(e => e.source);
    expect(sources).toContain('재생');
    expect(sources).toContain('흡혈');
    expect(sources).toContain('과살');
    expect(sources).toContain('생존');
  });

  test('returns empty array when totalHeal is 0', () => {
    const result = getHealBreakdown({
      regenHeal: 0,
      lifestealHeal: 0,
      overkillHeal: 0,
      survivalHeal: 0,
      totalHeal: 0,
    });
    expect(result).toHaveLength(0);
  });

  test('entries sorted by amount descending', () => {
    const result = getHealBreakdown({
      regenHeal: 5,
      lifestealHeal: 30,
      overkillHeal: 10,
      survivalHeal: 20,
      totalHeal: 65,
    });
    expect(result[0].amount).toBe(30);
    expect(result[1].amount).toBe(20);
  });

  test('each entry has icon', () => {
    const result = getHealBreakdown({
      regenHeal: 10,
      lifestealHeal: 5,
      overkillHeal: 0,
      survivalHeal: 0,
      totalHeal: 15,
    });
    for (const entry of result) {
      expect(entry.icon).toBeTruthy();
    }
  });
});
