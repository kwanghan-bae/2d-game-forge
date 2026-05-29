import { describe, it, expect } from 'vitest';

describe('DPS calculation', () => {
  const calcDps = (totalDmg: number, elapsedSec: number) =>
    totalDmg / Math.max(1, elapsedSec);

  it('calculates DPS correctly', () => {
    expect(calcDps(10000, 10)).toBe(1000);
    expect(calcDps(5000, 5)).toBe(1000);
  });

  it('handles zero elapsed (clamps to 1)', () => {
    expect(calcDps(500, 0)).toBe(500);
  });

  it('formats DPS abbreviations', () => {
    const format = (dps: number) =>
      dps >= 1_000_000 ? `${(dps / 1_000_000).toFixed(1)}M`
      : dps >= 1_000 ? `${(dps / 1_000).toFixed(1)}K`
      : `${Math.floor(dps)}`;
    expect(format(1500)).toBe('1.5K');
    expect(format(2500000)).toBe('2.5M');
    expect(format(800)).toBe('800');
  });
});
