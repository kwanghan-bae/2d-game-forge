import {
  COMBO_STREAK_THRESHOLD, COMBO_STREAK_EXP_BONUS, DANGER_ZONE_EXP_MUL,
  DANGER_STREAK_EXP_STEP, DANGER_STREAK_EXP_CAP, DANGER_EXP_SCALE_PER_10,
  DANGER_EXP_SCALE_CAP, ELITE_EXP_MUL, EXP_DIMINISH_THRESHOLD, EXP_DIMINISH_FACTOR,
  FIRST_BLOOD_EXP_MUL, SURVIVAL_STREAK_THRESHOLD, SURVIVAL_STREAK_EXP_BONUS,
  WAVE_BONUS_EXP_MUL, WAVE_PRESTIGE_EXP_BONUS, AREA_FAMILIARITY_CAP,
  AREA_FAMILIARITY_EXP_BONUS, COMBO_EXP_THRESHOLD, COMBO_EXP_BONUS_PER,
  CLOSE_CALL_HP_THRESHOLD, CLOSE_CALL_EXP_BONUS, GREED_MODE_GOLD_THRESHOLD,
  GREED_MODE_EXP_PENALTY, LEVEL_UP_EXP_BONUS, ELITE_BOUNTY_EXP_BONUS,
  EXP_DECAY_LEVEL_START, EXP_DECAY_PER_LEVEL, EXP_DECAY_CAP,
  BOSS_KILL_EXP_MUL, BOSS_EXP_PRESTIGE_BONUS, WEATHER_WIND_EXP_BONUS,
  ARENA_REWARD_MUL, NIGHT_EXP_MUL, EXP_CHAIN_KILLS_THRESHOLD, EXP_CHAIN_BONUS,
  QUICK_KILL_MAX_HITS, QUICK_KILL_EXP_BONUS, COMPANION_UNLOCK_WINS,
  COMPANION_EXP_BONUS, BOSS_SLAYER_EXP_BONUS, MULTI_KILL_THRESHOLD,
  MULTI_KILL_EXP_BONUS, SHRINE_BLESSING_EXP_BONUS, REVENGE_EXP_BONUS,
  LOW_HP_EXP_THRESHOLD, LOW_HP_EXP_BONUS, COMBO_BREAK_EXP_BONUS,
  GOLD_CASCADE_THRESHOLD, EXP_CASCADE_BONUS, PRESTIGE_EXP_BONUS,
  KILL_MOMENTUM_EXP_CAP, KILL_MOMENTUM_EXP_BONUS, EXP_DROUGHT_THRESHOLD,
  EXP_DROUGHT_BONUS, SURVIVOR_GRIT_EXP_BONUS, SURVIVAL_EXP_SCALE_CAP,
  SURVIVAL_EXP_SCALE, EXP_CHAIN_CAP, EXP_CHAIN_PER_FIGHT, ELITE_EXP_BONUS_RATE,
  COMBO_FINISHER_THRESHOLD, COMBO_FINISHER_EXP_MUL, EXP_PER_VILLAGE_CAP,
  EXP_PER_VILLAGE_BONUS, WAVE_SURVIVAL_EXP_MUL, DANGER_CASCADE_MUL,
  DANGER_EXP_CHAIN_MUL, BOSS_ENRAGE_EXP_BONUS, WAVE_EXP_SCALE_CAP,
  WAVE_SIZE, WAVE_EXP_SCALE_PER_WAVE, ELITE_EXP_CHAIN_BONUS,
  PRESTIGE_ALL_EXP_BONUS, BOSS_EXP_MASTERY_CAP, BOSS_EXP_MASTERY_PER_UNIQUE,
  ELITE_DANGER_EXP_BONUS, FINAL_MASTERY_CAP, FINAL_MASTERY_PER_1000_FIGHTS,
  ELITE_MASTERY_CAP, ELITE_MASTERY_PER_20, ELITE_MASTERY_UPGRADE_BONUS,
  COMBO_EXP_CASCADE_THRESHOLD, COMBO_EXP_CASCADE_MUL, PRESTIGE_EXP_SCALE_CAP,
  PRESTIGE_EXP_SCALE_BONUS, SURVIVAL_COMPOUND_THRESHOLD, SURVIVAL_COMPOUND_EXP_MUL,
  WAVE_DANGER_EXP_BONUS, CRIT_CHAIN_EXP_BONUS, DANGER_EXP_MASTERY_CAP,
  DANGER_EXP_MASTERY_PER_100, ELITE_VILLAGE_EXP_BURST, COMBO_ATK_ACCEL_THRESHOLD,
  COMBO_ATK_ACCEL_BONUS, COMBO_EXP_VELOCITY_CAP, COMBO_EXP_VELOCITY_RATE,
  WAVE_EXP_COMPOUND_CAP, WAVE_EXP_COMPOUND_RATE, CRIT_EXP_CHAIN_CAP,
  CRIT_EXP_CHAIN_RATE, ELITE_EXP_CASCADE_CAP, ELITE_EXP_CASCADE_RATE,
  ELITE_PRESTIGE_EXP_RATE, BOSS_EXP_CASCADE_CAP, BOSS_EXP_CASCADE_PER_BOSS,
  DANGER_EXP_SURGE_BONUS, WAVE_EXP_MASTERY_CAP, WAVE_EXP_MASTERY_RATE,
  FINAL_MASTERY2_CAP, FINAL_MASTERY_RATE, GREED_GAMBIT_GOLD_THRESHOLD,
  GREED_GAMBIT_EXP_BONUS, RISK_REWARD_DANGER_EXP, DEEP_DANGER_THRESHOLD,
  DEEP_DANGER_EXP_MUL, RUSH_HOUR_EXP_MUL, AGING_EXP_BONUS,
  ELDER_WISDOM_EXP_MUL, SCHOLAR_LENS_EXP_MUL, COLOSSEUM_EXP_MUL, TRIAL_GROUNDS_EXP_MUL,
  FOG_AMBUSH_EXP_MUL, WIND_GALE_EXP_MUL, VOID_RIFT_EXP_PER_TIER,
  ABYSSAL_CONVERGENCE_EXP_MUL,
} from './constants';

export interface ExpMultiplierContext {
  comboStreak: number;
  heroLevel: number;
  isDangerZone: boolean;
  isElite: boolean;
  isBoss: boolean;
  isNight: boolean;
  isArena: boolean;
  weather: string;
  tookDamage: boolean;
  didCrit: boolean;
  hitCount: number;
  heroHp: number;
  heroHpMax: number;
  heroGold: number;
  heroStaggered: boolean;
  firstBloodUsed: boolean;
  survivalStreak: number;
  waveRemaining: number;
  areaVisits: number;
  dangerStreak: number;
  totalDangerFights: number;
  dangerChainCount: number;
  dangerFights: number;
  levelUpMomentum: boolean;
  eliteBountyMilestones: number;
  killsSinceLevelUp: number;
  fightChainCount: number;
  consecutiveOneHits: number;
  comboBreakBonus: boolean;
  eliteCombo: number;
  prestigeCount: number;
  totalWins: number;
  totalDeaths: number;
  totalEliteKills: number;
  consecutiveWaveClears: number;
  consecutiveCrits: number;
  consecutiveBossKills: number;
  fightsSinceDeath: number;
  villageVisits: number;
  uniqueBossKills: number;
  rageTurn: number;
  shrineBlessingRemaining: number;
  revengeGoldRemaining: number;
  bossSlayerRemaining: number;
  survivorGritActive: boolean;
  dangerCascadeRemaining: number;
  eliteAfterVillage: boolean;
  prestigeReadyBonus: number;
  rushHourActive: boolean;
  heroAge: number;
  elderWisdomActive: boolean;
  hasScholarLens: boolean;
  critExpChain: number;
  baseExpGain: number;
  colosseumActive: boolean;
  trialGroundsActive: boolean;
  fogAmbushActive: boolean;
  windGaleActive: boolean; // C782
  snowDriftActive: boolean; // C782 (no EXP effect — combat only)
  abyssalConvergenceActive: boolean; // C789
  voidRiftTier: number; // C775: 0 if inactive, else tier number for EXP bonus
}

/**
 * Pure function: compute the total EXP multiplier from game state.
 * No side-effects — engine applies side-effects separately.
 */
export function computeExpMultiplier(ctx: ExpMultiplierContext): number {
  return computeExpMultiplierWithBreakdown(ctx).multiplier;
}

export interface ExpBreakdownEntry {
  name: string;
  value: number;
}

export interface ExpMultiplierWithBreakdown {
  multiplier: number;
  breakdown: ExpBreakdownEntry[];
}

export function computeExpMultiplierWithBreakdown(ctx: ExpMultiplierContext): ExpMultiplierWithBreakdown {
  const comboBonus = ctx.comboStreak >= COMBO_STREAK_THRESHOLD
    ? 1 + (ctx.comboStreak - COMBO_STREAK_THRESHOLD + 1) * COMBO_STREAK_EXP_BONUS
    : 1;
  const dangerMul2 = ctx.isDangerZone
    ? Math.min(DANGER_STREAK_EXP_CAP, DANGER_ZONE_EXP_MUL + (ctx.dangerStreak - 1) * DANGER_STREAK_EXP_STEP)
      + Math.min(DANGER_EXP_SCALE_CAP, Math.floor(ctx.totalDangerFights / 10) * DANGER_EXP_SCALE_PER_10)
    : 1;
  const eliteMul = ctx.isElite ? ELITE_EXP_MUL : 1;
  const diminish = ctx.heroLevel > EXP_DIMINISH_THRESHOLD
    ? Math.max(0.1, 1 - (ctx.heroLevel - EXP_DIMINISH_THRESHOLD) * EXP_DIMINISH_FACTOR)
    : 1;
  const firstBloodMul = !ctx.firstBloodUsed ? FIRST_BLOOD_EXP_MUL : 1;
  const survivalBonus = ctx.survivalStreak >= SURVIVAL_STREAK_THRESHOLD
    ? 1 + (ctx.survivalStreak - SURVIVAL_STREAK_THRESHOLD) * SURVIVAL_STREAK_EXP_BONUS
    : 1;
  const waveMulExp = ctx.waveRemaining > 0 ? (WAVE_BONUS_EXP_MUL + ctx.prestigeCount * WAVE_PRESTIGE_EXP_BONUS) : 1;
  const familiarityMul = 1 + Math.min(ctx.areaVisits, AREA_FAMILIARITY_CAP) * AREA_FAMILIARITY_EXP_BONUS;
  const comboExpMul = ctx.comboStreak >= COMBO_EXP_THRESHOLD
    ? 1 + (ctx.comboStreak - COMBO_EXP_THRESHOLD) * COMBO_EXP_BONUS_PER
    : 1;
  const closeCallMul = (!ctx.heroStaggered && ctx.heroHp < ctx.heroHpMax * CLOSE_CALL_HP_THRESHOLD && ctx.tookDamage)
    ? (1 + CLOSE_CALL_EXP_BONUS) : 1;
  const greedExpMul = ctx.heroGold >= GREED_MODE_GOLD_THRESHOLD ? (1 - GREED_MODE_EXP_PENALTY) : 1;
  const lvUpMul = ctx.levelUpMomentum ? (1 + LEVEL_UP_EXP_BONUS) : 1;
  const eliteBountyMul = 1 + ctx.eliteBountyMilestones * ELITE_BOUNTY_EXP_BONUS;
  const expDecayMul = ctx.heroLevel > EXP_DECAY_LEVEL_START
    ? Math.max(1 - EXP_DECAY_CAP, 1 - (ctx.heroLevel - EXP_DECAY_LEVEL_START) * EXP_DECAY_PER_LEVEL)
    : 1;
  const bossExpMul = ctx.isBoss ? (BOSS_KILL_EXP_MUL + ctx.prestigeCount * BOSS_EXP_PRESTIGE_BONUS) : 1;
  const weatherExpMul = ctx.weather === 'wind' ? (1 + WEATHER_WIND_EXP_BONUS) : 1;
  const arenaMul = ctx.isArena ? ARENA_REWARD_MUL : 1;
  const nightExpMul = ctx.isNight ? NIGHT_EXP_MUL : 1;
  const expChainMul = ctx.killsSinceLevelUp >= EXP_CHAIN_KILLS_THRESHOLD ? (1 + EXP_CHAIN_BONUS) : 1;
  const quickKillMul = ctx.hitCount <= QUICK_KILL_MAX_HITS ? (1 + QUICK_KILL_EXP_BONUS) : 1;
  const companionMul = ctx.totalWins >= COMPANION_UNLOCK_WINS ? (1 + COMPANION_EXP_BONUS) : 1;
  const bossSlayerMul = ctx.bossSlayerRemaining > 0 ? (1 + BOSS_SLAYER_EXP_BONUS) : 1;
  const multiKillMul = ctx.consecutiveOneHits >= MULTI_KILL_THRESHOLD ? (1 + MULTI_KILL_EXP_BONUS) : 1;
  const shrineBlessMul = ctx.shrineBlessingRemaining > 0 ? (1 + SHRINE_BLESSING_EXP_BONUS) : 1;
  const revengeExpMul = ctx.revengeGoldRemaining > 0 ? (1 + REVENGE_EXP_BONUS) : 1;
  const lowHpExpMul = ctx.heroHp < ctx.heroHpMax * LOW_HP_EXP_THRESHOLD ? (1 + LOW_HP_EXP_BONUS) : 1;
  const comboBreakMul = ctx.comboBreakBonus ? (1 + COMBO_BREAK_EXP_BONUS) : 1;
  const expCascadeMul = ctx.consecutiveOneHits >= GOLD_CASCADE_THRESHOLD ? (1 + EXP_CASCADE_BONUS) : 1;
  const prestigeExpMul = 1 + ctx.prestigeCount * PRESTIGE_EXP_BONUS;
  const killMomentumExp = 1 + Math.min(KILL_MOMENTUM_EXP_CAP, ctx.survivalStreak) * KILL_MOMENTUM_EXP_BONUS;
  const expDroughtMul = ctx.killsSinceLevelUp >= EXP_DROUGHT_THRESHOLD ? (1 + EXP_DROUGHT_BONUS) : 1;
  const survivorGritMul = ctx.survivorGritActive ? (1 + SURVIVOR_GRIT_EXP_BONUS) : 1;
  const survivalScaleMul = 1 + Math.min(SURVIVAL_EXP_SCALE_CAP, ctx.survivalStreak * SURVIVAL_EXP_SCALE);
  const expChainFightMul = 1 + Math.min(EXP_CHAIN_CAP, ctx.fightChainCount * EXP_CHAIN_PER_FIGHT);
  const eliteExpMul2 = ctx.isElite ? (1 + ELITE_EXP_BONUS_RATE) : 1;
  const comboFinisherMul = ctx.comboStreak >= COMBO_FINISHER_THRESHOLD ? COMBO_FINISHER_EXP_MUL : 1;
  const villageExpMul = 1 + Math.min(EXP_PER_VILLAGE_CAP, ctx.villageVisits * EXP_PER_VILLAGE_BONUS);
  const waveSurvivalMul = (ctx.waveRemaining > 0 && !ctx.tookDamage) ? WAVE_SURVIVAL_EXP_MUL : 1;
  const dangerCascadeExpMul = ctx.dangerCascadeRemaining > 0 ? DANGER_CASCADE_MUL : 1;
  const dangerChainMul = 1 + ctx.dangerChainCount * DANGER_EXP_CHAIN_MUL;
  const bossEnrageMul = (ctx.isBoss && ctx.rageTurn > 2) ? (1 + BOSS_ENRAGE_EXP_BONUS) : 1;
  const waveExpScaleMul = ctx.waveRemaining > 0 ? (1 + Math.min(WAVE_EXP_SCALE_CAP, (WAVE_SIZE - ctx.waveRemaining) * WAVE_EXP_SCALE_PER_WAVE)) : 1;
  const eliteExpChainMul = ctx.isElite && ctx.eliteCombo > 1 ? (1 + (ctx.eliteCombo - 1) * ELITE_EXP_CHAIN_BONUS) : 1;
  const prestigeAllExpMul = 1 + ctx.prestigeCount * PRESTIGE_ALL_EXP_BONUS;
  const bossExpMasteryMul = 1 + Math.min(BOSS_EXP_MASTERY_CAP, ctx.uniqueBossKills * BOSS_EXP_MASTERY_PER_UNIQUE);
  const eliteDangerMul = (ctx.isElite && ctx.isDangerZone) ? (1 + ELITE_DANGER_EXP_BONUS) : 1;
  const finalMasteryMul = 1 + Math.min(FINAL_MASTERY_CAP, Math.floor((ctx.totalWins + ctx.totalDeaths) / 1000) * FINAL_MASTERY_PER_1000_FIGHTS);
  const eliteMasteryMul = 1 + Math.min(ELITE_MASTERY_CAP, Math.floor(ctx.totalEliteKills / 20) * (ELITE_MASTERY_PER_20 + ctx.prestigeCount * ELITE_MASTERY_UPGRADE_BONUS));
  const comboExpCascadeMul = ctx.comboStreak >= COMBO_EXP_CASCADE_THRESHOLD ? (1 + COMBO_EXP_CASCADE_MUL) : 1;
  const prestigeExpScaleMul = 1 + Math.min(PRESTIGE_EXP_SCALE_CAP, ctx.prestigeCount * PRESTIGE_EXP_SCALE_BONUS);
  const survivalCompoundMul = ctx.fightsSinceDeath >= SURVIVAL_COMPOUND_THRESHOLD ? (1 + SURVIVAL_COMPOUND_EXP_MUL) : 1;
  const waveDangerMul = (ctx.isDangerZone && ctx.waveRemaining > 0) ? (1 + WAVE_DANGER_EXP_BONUS) : 1;
  const critChainExpMul = ctx.consecutiveCrits > 0 ? (1 + ctx.consecutiveCrits * CRIT_CHAIN_EXP_BONUS) : 1;
  const dangerExpMasteryMul = 1 + Math.min(DANGER_EXP_MASTERY_CAP, Math.floor(ctx.dangerFights / 100) * DANGER_EXP_MASTERY_PER_100);
  const eliteVillageBurstMul = (ctx.isElite && ctx.eliteAfterVillage) ? (1 + ELITE_VILLAGE_EXP_BURST) : 1;
  const comboAccelExpMul = ctx.comboStreak >= COMBO_ATK_ACCEL_THRESHOLD ? (1 + (ctx.comboStreak - COMBO_ATK_ACCEL_THRESHOLD) * COMBO_ATK_ACCEL_BONUS) : 1;
  const comboExpVelocityMul = ctx.comboStreak > 0 ? (1 + Math.min(COMBO_EXP_VELOCITY_CAP - 1, ctx.comboStreak * COMBO_EXP_VELOCITY_RATE)) : 1;
  const waveExpCompoundMul = 1 + Math.min(WAVE_EXP_COMPOUND_CAP - 1, ctx.consecutiveWaveClears * WAVE_EXP_COMPOUND_RATE);
  const critExpChainMul2 = 1 + Math.min(CRIT_EXP_CHAIN_CAP - 1, ctx.critExpChain * CRIT_EXP_CHAIN_RATE);
  const eliteExpCascadeMul = ctx.isElite ? (1 + Math.min(ELITE_EXP_CASCADE_CAP - 1, ctx.totalEliteKills * ELITE_EXP_CASCADE_RATE)) : 1;
  const elitePrestigeExpMul = ctx.isElite ? (1 + ctx.prestigeCount * ELITE_PRESTIGE_EXP_RATE) : 1;
  const bossExpCascadeMul = ctx.isBoss ? (1 + Math.min(BOSS_EXP_CASCADE_CAP - 1, ctx.consecutiveBossKills * BOSS_EXP_CASCADE_PER_BOSS)) : 1;
  const dangerExpSurgeMul = ctx.isDangerZone ? (1 + DANGER_EXP_SURGE_BONUS / Math.max(1, ctx.baseExpGain)) : 1;
  const waveExpMasteryMul = 1 + Math.min(WAVE_EXP_MASTERY_CAP - 1, ctx.consecutiveWaveClears * WAVE_EXP_MASTERY_RATE);
  const finalMasteryMul2 = 1 + Math.min(FINAL_MASTERY2_CAP - 1, ctx.totalWins * FINAL_MASTERY_RATE);
  const greedGambitExpMul = ctx.heroGold > GREED_GAMBIT_GOLD_THRESHOLD ? (1 + GREED_GAMBIT_EXP_BONUS) : 1;
  const riskRewardExpMul = ctx.isDangerZone ? (1 + Math.min(0.5, ctx.dangerFights * RISK_REWARD_DANGER_EXP * 0.1)) : 1;
  const deepDangerExpMul = ctx.dangerStreak >= DEEP_DANGER_THRESHOLD ? DEEP_DANGER_EXP_MUL : 1;
  const prestigeReadyExpMul = 1 + ctx.prestigeReadyBonus;
  const rushHourExpMul = ctx.rushHourActive ? RUSH_HOUR_EXP_MUL : 1;
  const agingExpMul = 1 + ctx.heroAge * AGING_EXP_BONUS;
  const elderWisdomExpMul = ctx.elderWisdomActive ? ELDER_WISDOM_EXP_MUL : 1;
  const scholarLensExpMul = ctx.hasScholarLens ? SCHOLAR_LENS_EXP_MUL : 1;
  const colosseumExpMul = ctx.colosseumActive ? COLOSSEUM_EXP_MUL : 1;
  const trialGroundsExpMul = ctx.trialGroundsActive ? TRIAL_GROUNDS_EXP_MUL : 1;
  const fogAmbushExpMul = ctx.fogAmbushActive ? FOG_AMBUSH_EXP_MUL : 1;
  const windGaleExpMul = ctx.windGaleActive ? WIND_GALE_EXP_MUL : 1; // C782
  const abyssalExpMul = ctx.abyssalConvergenceActive ? ABYSSAL_CONVERGENCE_EXP_MUL : 1; // C789
  const voidRiftExpMul = ctx.voidRiftTier > 0 ? (1 + VOID_RIFT_EXP_PER_TIER * ctx.voidRiftTier) : 1;

  const categories: { name: string; value: number }[] = [
    { name: 'core', value: dangerMul2 * eliteMul * nightExpMul * arenaMul * weatherExpMul * rushHourExpMul * agingExpMul * elderWisdomExpMul * scholarLensExpMul * colosseumExpMul * trialGroundsExpMul * fogAmbushExpMul * windGaleExpMul * abyssalExpMul * voidRiftExpMul },
    { name: 'combo', value: comboBonus * comboExpMul * comboBreakMul * comboFinisherMul * comboExpCascadeMul * comboAccelExpMul * comboExpVelocityMul },
    { name: 'combat', value: firstBloodMul * closeCallMul * quickKillMul * multiKillMul * revengeExpMul * critChainExpMul * critExpChainMul2 },
    { name: 'progress', value: diminish * lvUpMul * expDecayMul * expChainMul * expChainFightMul * killMomentumExp * familiarityMul * finalMasteryMul * finalMasteryMul2 },
    { name: 'danger', value: dangerCascadeExpMul * dangerChainMul * dangerExpMasteryMul * dangerExpSurgeMul * deepDangerExpMul * eliteDangerMul * waveDangerMul },
    { name: 'prestige', value: prestigeExpMul * prestigeAllExpMul * prestigeExpScaleMul * prestigeReadyExpMul },
    { name: 'misc', value: survivalBonus * waveMulExp * greedExpMul * eliteBountyMul * bossExpMul * companionMul * bossSlayerMul * shrineBlessMul * lowHpExpMul * expCascadeMul * expDroughtMul * survivorGritMul * survivalScaleMul * eliteExpMul2 * villageExpMul * waveSurvivalMul * bossEnrageMul * waveExpScaleMul * eliteExpChainMul * bossExpMasteryMul * eliteMasteryMul * survivalCompoundMul * eliteVillageBurstMul * waveExpCompoundMul * eliteExpCascadeMul * elitePrestigeExpMul * bossExpCascadeMul * waveExpMasteryMul * greedGambitExpMul * riskRewardExpMul },
  ];

  const multiplier = categories.reduce((acc, c) => acc * c.value, 1);
  const sorted = [...categories].sort((a, b) => b.value - a.value);

  return {
    multiplier,
    breakdown: sorted.slice(0, 3),
  };
}
