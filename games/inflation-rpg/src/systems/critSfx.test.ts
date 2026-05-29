import { describe, it, expect } from 'vitest';

describe('Critical hit SFX pitch calculation', () => {
  it('pitch scales inversely with damage ratio', () => {
    // dmgRatio 0 → rate 1.0 (normal pitch)
    // dmgRatio 1 → rate 0.7 (deep heavy pitch)
    const calcRate = (dmg: number, maxHp: number) => {
      const dmgRatio = Math.min(dmg / Math.max(1, maxHp), 1);
      return 1.0 - dmgRatio * 0.3;
    };
    expect(calcRate(0, 100)).toBe(1.0);
    expect(calcRate(50, 100)).toBeCloseTo(0.85);
    expect(calcRate(100, 100)).toBeCloseTo(0.7);
  });

  it('shake intensity increases with damage', () => {
    const calcShake = (dmg: number, maxHp: number) => {
      const dmgRatio = Math.min(dmg / Math.max(1, maxHp), 1);
      return 0.01 + dmgRatio * 0.01;
    };
    expect(calcShake(0, 100)).toBeCloseTo(0.01);
    expect(calcShake(100, 100)).toBeCloseTo(0.02);
  });
});
