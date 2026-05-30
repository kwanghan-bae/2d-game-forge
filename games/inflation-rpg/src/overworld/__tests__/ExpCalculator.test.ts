import { describe, it, expect } from 'vitest';
import { computeExpMultiplier, computeExpMultiplierWithBreakdown, type ExpMultiplierContext } from '../encounter/ExpCalculator';

function makeCtx(overrides: Partial<ExpMultiplierContext> = {}): ExpMultiplierContext {
  return {
    comboStreak: 0,
    heroLevel: 10,
    isDangerZone: false,
    isElite: false,
    isBoss: false,
    isNight: false,
    isArena: false,
    weather: 'none',
    tookDamage: false,
    didCrit: false,
    hitCount: 3,
    heroHp: 80,
    heroHpMax: 100,
    heroGold: 100,
    heroStaggered: false,
    firstBloodUsed: true,
    survivalStreak: 0,
    waveRemaining: 0,
    areaVisits: 0,
    dangerStreak: 0,
    totalDangerFights: 0,
    dangerChainCount: 0,
    dangerFights: 0,
    levelUpMomentum: false,
    eliteBountyMilestones: 0,
    killsSinceLevelUp: 0,
    fightChainCount: 0,
    consecutiveOneHits: 0,
    comboBreakBonus: false,
    eliteCombo: 0,
    prestigeCount: 0,
    totalWins: 50,
    totalDeaths: 5,
    totalEliteKills: 0,
    consecutiveWaveClears: 0,
    consecutiveCrits: 0,
    consecutiveBossKills: 0,
    fightsSinceDeath: 20,
    villageVisits: 0,
    uniqueBossKills: 0,
    rageTurn: 0,
    shrineBlessingRemaining: 0,
    revengeGoldRemaining: 0,
    bossSlayerRemaining: 0,
    survivorGritActive: false,
    dangerCascadeRemaining: 0,
    eliteAfterVillage: false,
    prestigeReadyBonus: 0,
    rushHourActive: false,
    heroAge: 0,
    elderWisdomActive: false,
    hasScholarLens: false,
    critExpChain: 0,
    baseExpGain: 100,
    colosseumActive: false,
    trialGroundsActive: false,
    fogAmbushActive: false,
    voidRiftTier: 0,
    ...overrides,
  };
}

describe('ExpCalculator', () => {
  it('returns baseline multiplier with zeroed context', () => {
    const result = computeExpMultiplier(makeCtx({ totalWins: 0, hitCount: 10, fightsSinceDeath: 0 }));
    // With fully zero context, only quickKill (hitCount>3 = no bonus) and companion (wins<threshold) apply
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(2.0);
  });

  it('applies danger zone multiplier', () => {
    const normal = computeExpMultiplier(makeCtx());
    const danger = computeExpMultiplier(makeCtx({ isDangerZone: true, dangerStreak: 3 }));
    expect(danger).toBeGreaterThan(normal);
  });

  it('applies combo bonus above threshold', () => {
    const noCombo = computeExpMultiplier(makeCtx({ comboStreak: 0 }));
    const highCombo = computeExpMultiplier(makeCtx({ comboStreak: 20 }));
    expect(highCombo).toBeGreaterThan(noCombo);
  });

  it('applies elite exp multiplier', () => {
    const normal = computeExpMultiplier(makeCtx());
    const elite = computeExpMultiplier(makeCtx({ isElite: true }));
    expect(elite).toBeGreaterThan(normal);
  });

  it('applies diminishing returns at high level', () => {
    const low = computeExpMultiplier(makeCtx({ heroLevel: 10 }));
    const high = computeExpMultiplier(makeCtx({ heroLevel: 200 }));
    expect(high).toBeLessThan(low);
  });

  it('C722: exp decay caps at 35% reduction (Lv 270+)', () => {
    // EXP_DECAY_PER_LEVEL=0.005, CAP=0.35, START=100
    // Lv 270: (270-100)*0.005=0.85 → capped at 0.35 → mul = 1-0.35=0.65
    // Lv 400: same cap → mul = 0.65
    const lv270 = computeExpMultiplier(makeCtx({ heroLevel: 270 }));
    const lv400 = computeExpMultiplier(makeCtx({ heroLevel: 400 }));
    expect(lv270).toBeCloseTo(lv400, 5); // both at cap
  });

  it('applies night exp bonus', () => {
    const day = computeExpMultiplier(makeCtx({ isNight: false }));
    const night = computeExpMultiplier(makeCtx({ isNight: true }));
    expect(night).toBeGreaterThan(day);
  });
});

describe('computeExpMultiplierWithBreakdown', () => {
  it('returns multiplier matching legacy function', () => {
    const ctx = makeCtx({ isElite: true, isDangerZone: true, comboStreak: 30 });
    const legacy = computeExpMultiplier(ctx);
    const result = computeExpMultiplierWithBreakdown(ctx);
    expect(result.multiplier).toBeCloseTo(legacy, 10);
  });

  it('returns top-3 breakdown sorted by contribution descending', () => {
    const ctx = makeCtx({ isElite: true, isDangerZone: true, comboStreak: 30 });
    const result = computeExpMultiplierWithBreakdown(ctx);
    expect(result.breakdown).toHaveLength(3);
    expect(result.breakdown[0].value).toBeGreaterThanOrEqual(result.breakdown[1].value);
    expect(result.breakdown[1].value).toBeGreaterThanOrEqual(result.breakdown[2].value);
    // Each entry has name and value
    expect(result.breakdown[0]).toHaveProperty('name');
    expect(result.breakdown[0]).toHaveProperty('value');
  });

  it('C757: colosseum doubles EXP multiplier', () => {
    const base = computeExpMultiplier(makeCtx());
    const colosseum = computeExpMultiplier(makeCtx({ colosseumActive: true }));
    expect(colosseum).toBeCloseTo(base * 2.0, 5);
  });

  it('C766: trial grounds applies 1.50x EXP multiplier', () => {
    const base = computeExpMultiplier(makeCtx());
    const trial = computeExpMultiplier(makeCtx({ trialGroundsActive: true }));
    expect(trial).toBeCloseTo(base * 1.50, 5);
  });
});
