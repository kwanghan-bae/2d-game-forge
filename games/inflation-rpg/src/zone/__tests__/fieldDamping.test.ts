import { describe, expect, it } from 'vitest';
import { computeFieldDamping } from '../fieldDamping';

describe('computeFieldDamping', () => {
  it('heroLv >= fieldLv → 1.0 (no damping)', () => {
    expect(computeFieldDamping(100, 50, 0)).toBe(1.0);
    expect(computeFieldDamping(100, 100, 0)).toBe(1.0);
  });

  it('diff 20, buff6=0 → 1 / (1 + 0.05*20) = 1/2 = 0.5', () => {
    expect(computeFieldDamping(50, 70, 0)).toBeCloseTo(0.5);
  });

  it('diff 100, buff6=0 → 1 / (1 + 5) ≈ 0.167', () => {
    expect(computeFieldDamping(50, 150, 0)).toBeCloseTo(1 / 6, 3);
  });

  it('buff6 cancels diff entirely', () => {
    expect(computeFieldDamping(50, 70, 20)).toBe(1.0);
  });

  it('buff6 partial cancel', () => {
    // diff=20, buff6=10 → effective=10 → 1/(1+0.5)=2/3
    expect(computeFieldDamping(50, 70, 10)).toBeCloseTo(2 / 3, 3);
  });

  it('huge diff still positive (never 0)', () => {
    const d = computeFieldDamping(1, 1_000_000, 0);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(0.001);
  });
});
