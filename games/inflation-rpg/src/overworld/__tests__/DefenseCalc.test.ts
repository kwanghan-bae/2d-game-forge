import { describe, it, expect } from 'vitest';
import { computeDamageReduction, type DefenseContext } from '../encounter/DefenseCalc';

function makeCtx(overrides: Partial<DefenseContext> = {}): DefenseContext {
  return {
    mercyRemaining: 0,
    shopShieldRemaining: 0,
    armorRemaining: 0,
    villageRestRemaining: 0,
    goldShieldActive: false,
    comboStreak: 0,
    goldOverflowShieldActive: false,
    bossShieldActive: false,
    prestigeCount: 0,
    isDangerZone: false,
    heroGold: 0,
    heroLevel: 10,
    cursedAltarAtkBuff: false,
    isNight: false,
    colosseumActive: false,
    ...overrides,
  };
}

describe('DefenseCalc', () => {
  it('returns 1.0 (no reduction) with no buffs active', () => {
    const mul = computeDamageReduction(makeCtx());
    expect(mul).toBe(1.0);
  });

  it('applies mercy reduction when mercyRemaining > 0', () => {
    const mul = computeDamageReduction(makeCtx({ mercyRemaining: 3 }));
    expect(mul).toBeLessThan(1.0);
  });

  it('applies armor reduction when armorRemaining > 0', () => {
    const mul = computeDamageReduction(makeCtx({ armorRemaining: 5 }));
    expect(mul).toBeLessThan(1.0);
  });

  it('stacks multiple shields multiplicatively', () => {
    const single = computeDamageReduction(makeCtx({ mercyRemaining: 3 }));
    const double = computeDamageReduction(makeCtx({ mercyRemaining: 3, armorRemaining: 5 }));
    expect(double).toBeLessThan(single);
  });

  it('cursed altar increases damage taken (mul > 1)', () => {
    const base = computeDamageReduction(makeCtx());
    const cursed = computeDamageReduction(makeCtx({ cursedAltarAtkBuff: true }));
    expect(cursed).toBeGreaterThan(base);
  });

  it('night increases damage taken', () => {
    const day = computeDamageReduction(makeCtx());
    const night = computeDamageReduction(makeCtx({ isNight: true }));
    expect(night).toBeGreaterThan(day);
  });

  it('floors at 0.30 (max 70% reduction)', () => {
    // All shields active — should floor at 0.30
    const mul = computeDamageReduction(makeCtx({
      mercyRemaining: 5,
      shopShieldRemaining: 5,
      armorRemaining: 5,
      villageRestRemaining: 5,
      goldShieldActive: true,
      comboStreak: 100,
      goldOverflowShieldActive: true,
      bossShieldActive: true,
      heroGold: 99999,
      heroLevel: 10,
    }));
    expect(mul).toBeCloseTo(0.30, 2);
  });

  it('prestige danger mastery reduces damage in danger zone', () => {
    const noPrestige = computeDamageReduction(makeCtx({ isDangerZone: true, prestigeCount: 0 }));
    const withPrestige = computeDamageReduction(makeCtx({ isDangerZone: true, prestigeCount: 5 }));
    expect(withPrestige).toBeLessThan(noPrestige);
  });

  it('C757: colosseum increases incoming damage by 1.3×', () => {
    const base = computeDamageReduction(makeCtx());
    const colosseum = computeDamageReduction(makeCtx({ colosseumActive: true }));
    expect(colosseum).toBeCloseTo(base * 1.3, 5);
  });
});
