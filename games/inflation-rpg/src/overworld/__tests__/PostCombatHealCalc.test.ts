import { describe, test, expect } from 'vitest';
import { computePostCombatHeal } from '../encounter/PostCombatHealCalc';

describe('PostCombatHealCalc', () => {
  const baseCtx = {
    totalWins: 0,
    totalDamageDealt: 100,
    villageVisits: 0,
    survivalStreak: 0,
    isOverkill: false,
    prestigeCount: 0,
    heroHpMax: 1000,
  };

  test('base regen: WIN_HP_REGEN_RATE × heroHpMax', () => {
    const result = computePostCombatHeal(baseCtx);
    // WIN_HP_REGEN_RATE = 0.015, heroHpMax = 1000 → 15
    expect(result.regenHeal).toBe(15);
  });

  test('regen scales with kills (REGEN_SCALE_PER_50_KILLS)', () => {
    const result = computePostCombatHeal({ ...baseCtx, totalWins: 150 });
    // 150/50 = 3 → 3 × 0.001 = 0.003 extra
    // total rate = 0.015 + 0.003 = 0.018 → floor(1000×0.018) = 18
    expect(result.regenHeal).toBe(18);
  });

  test('regen buff ×1.5 with 10+ village visits', () => {
    const result = computePostCombatHeal({ ...baseCtx, villageVisits: 10 });
    // 15 × 1.5 = 22.5 → floor = 22
    expect(result.regenHeal).toBe(22);
  });

  test('lifesteal: totalDamageDealt × LIFESTEAL_RATE', () => {
    const result = computePostCombatHeal({ ...baseCtx, totalDamageDealt: 500 });
    // 500 × 0.01 = 5
    expect(result.lifestealHeal).toBe(5);
  });

  test('lifesteal prestige boost', () => {
    const result = computePostCombatHeal({ ...baseCtx, totalDamageDealt: 500, prestigeCount: 2 });
    // 500 × 0.01 × (1 + 2×0.03) = 500 × 0.01 × 1.06 = 5.3 → floor = 5
    expect(result.lifestealHeal).toBe(5);
  });

  test('overkill heal when isOverkill=true', () => {
    const result = computePostCombatHeal({ ...baseCtx, isOverkill: true });
    // OVERKILL_HEAL_RATE = 0.02, heroHpMax = 1000 → 20
    expect(result.overkillHeal).toBe(20);
  });

  test('no overkill heal when isOverkill=false', () => {
    const result = computePostCombatHeal(baseCtx);
    expect(result.overkillHeal).toBe(0);
  });

  test('survival heal when streak >= threshold (10)', () => {
    const result = computePostCombatHeal({ ...baseCtx, survivalStreak: 15 });
    // SURVIVAL_HEAL_RATE = 0.03 → 1000×0.03 = 30
    expect(result.survivalHeal).toBe(30);
  });

  test('no survival heal below threshold', () => {
    const result = computePostCombatHeal({ ...baseCtx, survivalStreak: 5 });
    expect(result.survivalHeal).toBe(0);
  });

  test('totalHeal is sum of all sources', () => {
    const result = computePostCombatHeal({
      ...baseCtx,
      totalDamageDealt: 500,
      isOverkill: true,
      survivalStreak: 15,
    });
    expect(result.totalHeal).toBe(
      result.regenHeal + result.lifestealHeal + result.overkillHeal + result.survivalHeal
    );
  });

});
