import { describe, test, expect } from 'vitest';
import { computeGoldReward, type GoldRewardContext } from '../encounter/GoldCalculator';

function makeContext(overrides: Partial<GoldRewardContext> = {}): GoldRewardContext {
  return {
    heroLevel: 10,
    heroGold: 100,
    heroHp: 100,
    heroHpMax: 100,
    isBoss: false,
    isElite: false,
    isTreasureGoblin: false,
    isDangerZone: false,
    isOverkill: false,
    didCrit: false,
    tookDamage: false,
    comboStreak: 0,
    battleMomentum: 0,
    consecutiveOneHits: 0,
    totalCrits: 0,
    fightsSinceSpend: 0,
    killCount: 5,
    caveVisits: 0,
    bossesKilled: 0,
    dangerStreak: 0,
    dangerFights: 0,
    waveRemaining: 0,
    consecutiveCrits: 0,
    fightChainCount: 0,
    prestigeCount: 0,
    revengeGoldRemaining: 0,
    villageBlessingRemaining: 0,
    eliteCombo: 0,
    uniqueBossKills: 0,
    consecutiveEliteKills2: 0,
    overkillChain: 0,
    consecutiveBossKills: 0,
    deathGoldCompound: 0,
    consecutiveWaveClears: 0,
    totalEliteKills: 0,
    totalWins: 10,
    goldenHourRemaining: 0,
    rushHourActive: false,
    hasRelic1: false,
    arenaMul: 1,
    rngDoubleGold: false,
    ...overrides,
  };
}

describe('GoldCalculator', () => {
  test('base gold scales with hero level', () => {
    const ctx = makeContext({ heroLevel: 1 });
    const r1 = computeGoldReward(ctx);
    const ctx2 = makeContext({ heroLevel: 50 });
    const r2 = computeGoldReward(ctx2);
    expect(r2.goldEarned).toBeGreaterThan(r1.goldEarned);
  });

  test('boss kill gives more gold than normal', () => {
    const normal = computeGoldReward(makeContext());
    const boss = computeGoldReward(makeContext({ isBoss: true }));
    expect(boss.goldEarned).toBeGreaterThan(normal.goldEarned);
  });

  test('combo streak boosts gold above threshold', () => {
    const low = computeGoldReward(makeContext({ comboStreak: 0 }));
    const high = computeGoldReward(makeContext({ comboStreak: 30 }));
    expect(high.goldEarned).toBeGreaterThan(low.goldEarned);
  });

  test('gold is capped at heroLevel * 2500', () => {
    // Force massive multipliers
    const ctx = makeContext({
      heroLevel: 1,
      isBoss: true,
      isOverkill: true,
      didCrit: true,
      comboStreak: 100,
      prestigeCount: 15,
      isDangerZone: true,
      dangerStreak: 20,
      totalWins: 10000,
      totalCrits: 1000,
    });
    const result = computeGoldReward(ctx);
    expect(result.goldEarned).toBeLessThanOrEqual(ctx.heroLevel * 2500);
  });

  test('combo gold floor applies when combo high but multipliers low', () => {
    // comboStreak >= COMBO_GOLD_FLOOR_THRESHOLD → floor = heroLevel * COMBO_GOLD_FLOOR_PER_LEVEL
    const ctx = makeContext({ heroLevel: 10, comboStreak: 50, heroGold: 0 });
    const result = computeGoldReward(ctx);
    // Should get at least the floor value (non-zero)
    expect(result.goldEarned).toBeGreaterThan(0);
  });

  test('returns side effects (greed gambit, sacrifice, combo tax)', () => {
    // With high gold, greed gambit should trigger
    const ctx = makeContext({ heroLevel: 100, heroGold: 999999 });
    const result = computeGoldReward(ctx);
    expect(result).toHaveProperty('greedPenalty');
    expect(result).toHaveProperty('sacrificeGold');
    expect(result).toHaveProperty('sacrificeExp');
  });
});
