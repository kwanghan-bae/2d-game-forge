import { describe, it, expect } from 'vitest';
import { computeAtkMultipliers, type AtkMultiplierContext } from '../../overworld/encounter/AtkMultiplierCalc';

function baseCtx(): AtkMultiplierContext {
  return {
    damping: 1.0,
    bossAtkMul: 1.0,
    realmAtkMul: 1.0,
    battleMomentum: 0,
    shrineBuffActive: false,
    isRevengeFight: false,
    killMilestones: 0,
    hpRatio: 1.0,
    fightsSinceVillage: 0,
    shrineTithes: 0,
    hadShieldBreak: false,
    hadComboBreaker: false,
    prestigeCount: 0,
    achievementMilestones: 0,
    totalDeaths: 0,
    darknessCursed: false,
    heroLevel: 50,
    sacrificeFuryActive: false,
    heroGold: 0,
    bossesKilled: 0,
    hpBelowAdrenaline: false,
    hadVillageTraining: false,
    consecutiveDeaths: 0,
    consecutiveCrits: 0,
    isDangerZone: false,
    comboStreak: 0,
    dangerChainCount: 0,
    hadBossFury: false,
    consecutiveBossKills: 0,
    heroHp: 100,
    heroHpMax: 100,
    uniqueBossKills: 0,
    hadPrestigeSurge: false,
    hadVillageRestAtk: false,
    hadWaveMomentum: false,
    hadRevengeStreak: false,
    revengeStreakPower: 0,
    consecutiveWaveClears: 0,
    totalWins: 0,
    totalFights: 0,
    hadEliteChainAtk: false,
    eliteCombo: 0,
    hadDeathAtkSurge: false,
    dangerFights: 0,
    hadVillageAtkTraining: false,
    hadPrestigeEcho: false,
    prestigeEchoDecay: 0,
    hadWaveExhaustion: false,
    isElite: false,
    hpBelowBloodPact: false,
    hpBelowAdrenalineRush: false,
    hadShieldSacrifice: false,
    hadShieldBreakBurst: false,
    dangerBetActive: false,
    totalSacrifices: 0,
    accumulatorBonus: 0,
    heroAge: 0,
    temporalPrestigeBonus: 0,
    lowHpFury: false,
    kind: 'normal',
    deathProximityCrit: 0,
    dangerStreak: 0,
    isPrestigeReady: false,
    activeSynergiesFromBloodFury: false,
    activeSynergiesFromElderWisdom: false,
    activeSynergiesFromDesperateTrade: false,
    antiSynergyActive: false,
    goldenHourHighCombo: false,
    wealthSacrificeActive: false,
    synergyPrestigeBonus: 0,
    hasEmberCrown: false,
    emberCrownStacks: 0,
    hasScholarLens: false,
    cursedAltarAtkBuff: false,
    inspirationActive: false,
    comboPrestigeFlat: 0,
    comboMilestoneBonus: 0,
    combatMastery: 0,
    waveChainAtk: 0,
    deathCountAtk: 0,
    dangerComboAtk: 0,
    comboAtkMilestone: 0,
    heroAtk: 30,
    weather: null,
  };
}

describe('AtkMultiplierCalc', () => {
  it('returns baseline multipliers with truly neutral context', () => {
    // heroHp < heroHpMax to avoid full-HP condition bonus
    const result = computeAtkMultipliers({ ...baseCtx(), heroHp: 50 });
    expect(result.coreMuls).toBeCloseTo(1.0);
    expect(result.conditionMuls).toBeCloseTo(1.0);
    expect(result.goldMuls).toBeCloseTo(1.0);
    expect(result.combatMuls).toBeCloseTo(1.0);
    expect(result.progressMuls).toBeCloseTo(1.0);
    expect(result.chainMuls).toBeCloseTo(1.0);
    expect(result.tradeoffMuls).toBeCloseTo(1.0);
    expect(result.systemMuls).toBeCloseTo(1.0);
  });

  it('computes coreMuls with momentum and prestige', () => {
    const ctx = { ...baseCtx(), battleMomentum: 10, prestigeCount: 3, killMilestones: 5 };
    const result = computeAtkMultipliers(ctx);
    // momentum: 1 + 10*0.02 = 1.2, prestige: 1 + 3*0.10 = 1.3, milestone: 1 + 5*0.01 = 1.05
    expect(result.coreMuls).toBeGreaterThan(1.2);
  });

  it('applies weather rain penalty to conditionMuls', () => {
    const ctx = { ...baseCtx(), weather: 'rain' as const };
    const result = computeAtkMultipliers(ctx);
    expect(result.conditionMuls).toBeLessThan(1.0);
  });

  it('C749: inspiration active applies +15% to progressMuls', () => {
    const base = computeAtkMultipliers({ ...baseCtx(), heroHp: 50 });
    const inspired = computeAtkMultipliers({ ...baseCtx(), heroHp: 50, inspirationActive: true });
    expect(inspired.progressMuls).toBeCloseTo(base.progressMuls * 1.15, 5);
  });

  it('C749: inspiration inactive has no effect on progressMuls', () => {
    const base = computeAtkMultipliers({ ...baseCtx(), heroHp: 50 });
    const notInspired = computeAtkMultipliers({ ...baseCtx(), heroHp: 50, inspirationActive: false });
    expect(notInspired.progressMuls).toEqual(base.progressMuls);
  });
});
