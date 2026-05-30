import { describe, test, expect } from 'vitest';
import { computeDropChance } from '../encounter/DropResolver';

describe('DropResolver', () => {
  const baseCtx = {
    isBoss: false,
    isElite: false,
    eliteCombo: 0,
    firstBloodUsed: true,
    isOverkill: false,
    bossSlayerRemaining: 0,
    dropChanceBonus: 0,
    introDropBonus: 0,
    dropStreak: 0,
    heroLevel: 1,
  };

  test('base drop rate for normal enemies', () => {
    const result = computeDropChance(baseCtx);
    // DROP_RATE = 0.36
    expect(result.dropOdds).toBeCloseTo(0.36, 2);
    expect(result.upgradePool).toBe(false);
  });

  test('boss: near-guaranteed drop (0.96)', () => {
    const result = computeDropChance({ ...baseCtx, isBoss: true });
    expect(result.dropOdds).toBeCloseTo(0.96, 2);
  });

  test('elite: guaranteed drop (1.0)', () => {
    const result = computeDropChance({ ...baseCtx, isElite: true });
    expect(result.dropOdds).toBe(1.0);
  });

  test('first blood: guaranteed drop', () => {
    const result = computeDropChance({ ...baseCtx, firstBloodUsed: false });
    expect(result.dropOdds).toBe(1.0);
  });

  test('overkill bonus adds OVERKILL_DROP_BONUS', () => {
    const result = computeDropChance({ ...baseCtx, isOverkill: true });
    // 0.36 + 0.15 = 0.51
    expect(result.dropOdds).toBeCloseTo(0.51, 2);
  });

  test('elite boss synergy adds bonus', () => {
    const result = computeDropChance({ ...baseCtx, isElite: true, bossSlayerRemaining: 5 });
    // 1.0 + synergy bonus, capped at 1.0
    expect(result.dropOdds).toBe(1.0);
  });

  test('drop streak threshold triggers upgrade pool', () => {
    const result = computeDropChance({ ...baseCtx, dropStreak: 3 });
    // DROP_STREAK_THRESHOLD = 3
    expect(result.upgradePool).toBe(true);
  });

  test('boss never gets upgradePool', () => {
    const result = computeDropChance({ ...baseCtx, isBoss: true, dropStreak: 5 });
    expect(result.upgradePool).toBe(false);
  });

  test('dropOdds capped at 1.0', () => {
    const result = computeDropChance({
      ...baseCtx,
      isElite: true,
      isOverkill: true,
      dropChanceBonus: 0.5,
    });
    expect(result.dropOdds).toBe(1.0);
  });

  test('elite combo threshold guarantees drop', () => {
    const result = computeDropChance({ ...baseCtx, isElite: true, eliteCombo: 3 });
    expect(result.dropOdds).toBe(1.0);
  });

  test('drop diminish reduces rate at high levels', () => {
    // At level 200: diminish = floor(200/100)*0.015 = 0.03
    // dropOdds = 0.36 * (1 - 0.03) = 0.36 * 0.97 = 0.3492
    const result = computeDropChance({ ...baseCtx, heroLevel: 200 });
    expect(result.dropOdds).toBeCloseTo(0.3492, 3);
  });

  test('drop diminish does not affect guaranteed drops (elite/boss)', () => {
    const result = computeDropChance({ ...baseCtx, isElite: true, heroLevel: 500 });
    expect(result.dropOdds).toBe(1.0);
  });

  test('drop diminish capped at max reduction', () => {
    // At level 3000: diminish = floor(3000/100)*0.015 = 0.45, capped at 0.40
    // dropOdds = 0.36 * (1 - 0.40) = 0.36 * 0.60 = 0.216
    const result = computeDropChance({ ...baseCtx, heroLevel: 3000 });
    expect(result.dropOdds).toBeCloseTo(0.216, 3);
  });
});
