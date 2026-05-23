import { describe, it, expect } from 'vitest';
import { getAgingDebuff } from '../agingDebuff';

describe('getAgingDebuff', () => {
  it('age 5-49 → no debuff (all multipliers = 1)', () => {
    for (const age of [5, 20, 30, 49]) {
      const d = getAgingDebuff(age);
      expect(d.atkMul).toBe(1);
      expect(d.hpMul).toBe(1);
      expect(d.moveMul).toBe(1);
    }
  });

  it('age 50-69 → small debuff: atk/hp ~0.95, move ~0.98', () => {
    const d = getAgingDebuff(50);
    expect(d.atkMul).toBeLessThan(1);
    expect(d.atkMul).toBeGreaterThan(0.9);
    expect(d.moveMul).toBeLessThan(1);
    expect(d.moveMul).toBeGreaterThan(0.95);
  });

  it('age 70+ → bigger debuff: atk ~0.85-0.95', () => {
    const d = getAgingDebuff(70);
    expect(d.atkMul).toBeLessThanOrEqual(0.95);
    expect(d.atkMul).toBeGreaterThan(0.7);
  });

  it('age 100 → severe debuff: atk ~0.5-0.6', () => {
    const d = getAgingDebuff(100);
    expect(d.atkMul).toBeLessThanOrEqual(0.6);
    expect(d.atkMul).toBeGreaterThan(0.4);
  });

  it('age 200 → near-frozen: atk ~0.1, but > 0', () => {
    const d = getAgingDebuff(200);
    expect(d.atkMul).toBeLessThanOrEqual(0.15);
    expect(d.atkMul).toBeGreaterThan(0);
  });

  it('age 1000 → still > 0 (never zero, hero is eternal)', () => {
    const d = getAgingDebuff(1000);
    expect(d.atkMul).toBeGreaterThan(0);
    expect(d.moveMul).toBeGreaterThan(0);
  });
});
