import { describe, it, expect } from 'vitest';
import {
  heroAtkAtLevel,
  heroHpMaxAtLevel,
  enemyHpAtLevel,
  enemyAtkAtLevel,
  expGainForKill,
  expRequiredForLevel,
} from '../inflationCurve';

describe('inflationCurve power-law functions', () => {
  it('heroAtkAtLevel: base case lv1 = base', () => {
    expect(heroAtkAtLevel(10, 1)).toBe(10);
  });

  it('heroAtkAtLevel: lv10 = floor(10 * 10^1.0) = 100', () => {
    expect(heroAtkAtLevel(10, 10)).toBe(100);
  });

  it('expGainForKill: lv5 = floor(10 * 5^1.6)', () => {
    const expected = Math.floor(10 * Math.pow(5, 1.6));
    expect(expGainForKill(10, 5)).toBe(expected);
  });

  it('expRequiredForLevel: lv5 = floor(10 * 5^1.2)', () => {
    const expected = Math.floor(10 * Math.pow(5, 1.2));
    expect(expRequiredForLevel(10, 5)).toBe(expected);
  });

  it('acceleration: expGain grows faster than expReq (ratio = lv^0.4)', () => {
    const gain5 = expGainForKill(10, 5);
    const gain10 = expGainForKill(10, 10);
    const req5 = expRequiredForLevel(10, 5);
    const req10 = expRequiredForLevel(10, 10);
    const ratioAt5 = gain5 / req5;
    const ratioAt10 = gain10 / req10;
    // Ratio should increase with level (acceleration)
    expect(ratioAt10).toBeGreaterThan(ratioAt5);
  });

  it('all functions return >= 1 at level 0', () => {
    expect(heroAtkAtLevel(10, 0)).toBeGreaterThanOrEqual(1);
    expect(heroHpMaxAtLevel(10, 0)).toBeGreaterThanOrEqual(1);
    expect(enemyHpAtLevel(20, 0, 1.0)).toBeGreaterThanOrEqual(1);
    expect(enemyAtkAtLevel(3, 0, 1.0)).toBeGreaterThanOrEqual(1);
    expect(expGainForKill(10, 0)).toBeGreaterThanOrEqual(1);
    expect(expRequiredForLevel(10, 0)).toBeGreaterThanOrEqual(1);
  });

  it('enemyAtkAtLevel uses k_eAtk=0.8 (grows slower than heroAtk k=1.0)', () => {
    const heroAtk100 = heroAtkAtLevel(10, 100);
    const enemyAtk100 = enemyAtkAtLevel(10, 100, 1.0);
    // hero 10*100^1.0=1000, enemy 10*100^0.8=398
    expect(heroAtk100).toBeGreaterThan(enemyAtk100);
  });

  it('bossMul scales enemy stats', () => {
    const normal = enemyHpAtLevel(20, 10, 1.0);
    const boss = enemyHpAtLevel(20, 10, 3.0);
    expect(boss).toBe(normal * 3);
  });
});
