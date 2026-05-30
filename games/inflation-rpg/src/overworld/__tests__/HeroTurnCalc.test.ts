import { describe, it, expect } from 'vitest';
import { computeHeroTurn, HeroTurnInput } from '../encounter/HeroTurnCalc';

describe('HeroTurnCalc', () => {
  const baseInput: HeroTurnInput = {
    baseHeroAtk: 100,
    canCrit: true,
    critStreak: 0,
    critStreakGuaranteeThreshold: 3,
    berserkerHpThreshold: 0.3,
    heroHpRatio: 1.0,
    berserkerCritBonus: 0.15,
    eliteFuryActive: false,
    eliteFuryCritBonus: 0.1,
    isBoss: false,
    bossCritBonus: 0.05,
    deathProxCritActive: false,
    baseCritChance: 0.05,
    weatherCritMul: 1.0,
    critMasteryBonus: 0,
    rngChance: () => false,
    rngLuckyCrit: () => false,
    luckyCritMul: 3.0,
    critDamageMul: 2.0,
    prestigeCount: 0,
    prestigeCritDmgBonus: 0.05,
    comboStreak: 0,
    comboCritSynergyThreshold: 10,
    comboCritDmgBonus: 0.2,
    isDangerZone: false,
    dangerCritBonus: 0.15,
    critComboSynergyThreshold: 15,
    critComboSynergyBonus: 0.1,
    desperateTradeActive: false,
    desperateTradeCritMul: 3.0,
  };

  it('no crit when canCrit=false', () => {
    const result = computeHeroTurn({ ...baseInput, canCrit: false });
    expect(result.isCrit).toBe(false);
    expect(result.heroAtk).toBe(100);
  });

  it('guaranteed crit when critStreak >= threshold', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3 });
    expect(result.isCrit).toBe(true);
    expect(result.heroAtk).toBe(200); // 100 * 2.0
    expect(result.newCritStreak).toBe(0); // consumed
  });

  it('deathProxCrit forces crit', () => {
    const result = computeHeroTurn({ ...baseInput, deathProxCritActive: true });
    expect(result.isCrit).toBe(true);
  });

  it('crit applies prestigeCritDmgBonus', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3, prestigeCount: 2 });
    // 100 * 2.0 * (1 + 2*0.05) = 100 * 2.0 * 1.1 = 220
    expect(result.heroAtk).toBe(220);
  });

  it('comboCritSynergy multiplier at high combo', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3, comboStreak: 10 });
    // 100 * 2.0 * (1 + 0.2) = 240
    expect(result.heroAtk).toBe(240);
  });

  it('dangerCrit bonus in danger zone', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3, isDangerZone: true });
    // 100 * 2.0 * (1 + 0.15) = floor(230) — may be 229 due to FP
    expect(result.heroAtk).toBeGreaterThanOrEqual(229);
    expect(result.heroAtk).toBeLessThanOrEqual(230);
    expect(result.isCrit).toBe(true);
  });

  it('no crit when rng returns false and no guarantees', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 0, rngChance: () => false });
    expect(result.isCrit).toBe(false);
    expect(result.heroAtk).toBe(100);
    expect(result.newCritStreak).toBe(0);
  });

  it('crit increments critStreak', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 1, rngChance: () => true });
    expect(result.isCrit).toBe(true);
    expect(result.newCritStreak).toBe(2);
  });

  it('lucky crit uses luckyCritMul', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3, rngLuckyCrit: () => true });
    // 100 * 3.0 * (1+0) = 300
    expect(result.heroAtk).toBe(300);
  });

  it('desperate trade multiplier stacks with crit', () => {
    const result = computeHeroTurn({ ...baseInput, critStreak: 3, desperateTradeActive: true });
    // 100 * 2.0 * 3.0 = 600
    expect(result.heroAtk).toBe(600);
  });
});
