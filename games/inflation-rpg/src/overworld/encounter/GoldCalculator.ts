/**
 * GoldCalculator — pure function computing gold earned from battle.
 * Extracted from EncounterEngine L1246-L1391 (C674).
 *
 * Returns earned gold + side-effect deltas for engine to apply.
 */
import {
  GOLD_PER_KILL_BASE, GOLD_LEVEL_POWER, GOLD_BOSS_MUL, GOLD_ELITE_MUL,
  TREASURE_GOBLIN_GOLD_MUL, DANGER_ZONE_GOLD_MUL, WAVE_BONUS_GOLD_MUL,
  GOLD_MOMENTUM_THRESHOLD, GOLD_MOMENTUM_BONUS,
  COMBO_GOLD_THRESHOLD, COMBO_GOLD_BONUS_PER,
  OVERKILL_GOLD_BONUS, CRIT_GOLD_BONUS, CRIT_GOLD_SCALE_CAP, CRIT_GOLD_SCALE_PER_100,
  GREED_MODE_GOLD_THRESHOLD, GREED_MODE_GOLD_BONUS,
  REVENGE_GOLD_BONUS, TREASURE_HUNTER_CAVE_INTERVAL, TREASURE_HUNTER_GOLD_BONUS,
  GOLD_STREAK_THRESHOLD, GOLD_STREAK_BONUS,
  COMBO_GOLD_MUL_THRESHOLD, COMBO_GOLD_MUL_BONUS,
} from './constants-combat';
import {
  OVERKILL_CHAIN_CAP, OVERKILL_CHAIN_GOLD_MUL,
  COMBO_MILESTONE_INTERVAL, COMBO_MILESTONE_GOLD_BONUS,
  FULL_HP_GOLD_BONUS, ELITE_GOLD_BONUS,
  GOLD_CASCADE_THRESHOLD, GOLD_CASCADE_MULTIPLIER,
  VILLAGE_BLESSING_GOLD_BONUS, GOLD_PER_BOSS_BONUS,
  GOLD_LEVEL_MILESTONE, GOLD_LEVEL_MILESTONE_BONUS,
  DANGER_GOLD_SCALE, TREASURE_HOARD_INTERVAL, TREASURE_HOARD_MUL,
  COMBO_GOLD_HIGH_THRESHOLD, COMBO_GOLD_HIGH_MUL,
  KILL_STREAK_GOLD_THRESHOLD, KILL_STREAK_GOLD_BONUS,
  GOLD_HARVEST_BONUS, GOLD_PER_CRIT_CAP, GOLD_PER_CRIT,
  WAVE_FINISHER_GOLD_MUL,
  CRIT_GOLD_BONUS_MUL, WAVE_GOLD_SURGE_PER_KILL,
  CRIT_CHAIN_GOLD_BONUS, PRESTIGE_GOLD_MUL_BONUS,
  COMBO_GOLD_FLOOR_THRESHOLD, COMBO_GOLD_FLOOR_PER_LEVEL,
} from './constants-economy';
import {
  COMBO_GOLD_ESCALATION_THRESHOLD, COMBO_GOLD_ESCALATION_BONUS,
  COMBO_GOLD_VELOCITY_BONUS,
  PRESTIGE_GOLD_PER_COUNT,
  DANGER_PRESTIGE_GOLD_MUL, DANGER_MASTERY_CAP, DANGER_MASTERY_PER_50,
  DANGER_GOLD_STREAK_BONUS, DANGER_STREAK_COMPOUND_THRESHOLD, DANGER_STREAK_GOLD_COMPOUND,
  ELITE_GOLD_CHAIN_BONUS, BOSS_TROPHY_GOLD_PER_UNIQUE,
  WAVE_GOLD_ACCUMULATOR_MUL, OVERKILL_CHAIN_EXTRA_CAP, OVERKILL_CHAIN_EXTRA_MUL,
  BOSS_GOLD_CASCADE_PER_BOSS, PRESTIGE_GOLD_CASCADE_CAP, PRESTIGE_GOLD_CASCADE_BONUS,
  DEATH_GOLD_COMPOUND_CAP,
  PRESTIGE_DANGER_GOLD_BONUS, CRIT_GOLD_MASTERY_CAP, CRIT_GOLD_MASTERY_PER_50,
  COMBO_DANGER_SYNERGY_THRESHOLD, COMBO_DANGER_SYNERGY_MUL,
  DANGER_GOLD_MASTERY_CAP, DANGER_GOLD_MASTERY_RATE,
  ELITE_GOLD_MASTERY_CAP, ELITE_GOLD_MASTERY_RATE,
  PRESTIGE_GOLD_MOMENTUM_CAP, PRESTIGE_GOLD_MOMENTUM_RATE,
  CRIT_GOLD_CASCADE_CAP, CRIT_GOLD_CASCADE_RATE,
  COMBO_PRESTIGE_GOLD_CAP, COMBO_PRESTIGE_GOLD_RATE,
  WAVE_GOLD_SURGE_SCALE, WAVE_GOLD_CASCADE_PER_FIGHT,
} from './constants-progression';
import {
  ELITE_GOLD_CASCADE_CAP, ELITE_GOLD_CASCADE_PER_ELITE,
  FINAL_MASTERY2_CAP, FINAL_MASTERY_RATE,
  FULL_HP_FORTUNE_GOLD_MUL, ELITE_HUNTER_STREAK, ELITE_HUNTER_REWARD_MUL,
  GOLDEN_HOUR_GOLD_MUL, RUSH_HOUR_GOLD_MUL, MISER_POUCH_GOLD_MUL,
  GREED_GAMBIT_GOLD_THRESHOLD, GREED_GAMBIT_GOLD_PENALTY,
  SACRIFICE_GOLD_RATE, SACRIFICE_GOLD_EXP_RATIO,
  COMBO_TAX_THRESHOLD, COMBO_TAX_RATE, COMBO_TAX_REWARD_MUL,
} from './constants-events';
import { WAVE_SIZE } from './constants-combat';

export interface GoldRewardContext {
  heroLevel: number;
  heroGold: number;
  heroHp: number;
  heroHpMax: number;
  isBoss: boolean;
  isElite: boolean;
  isTreasureGoblin: boolean;
  isDangerZone: boolean;
  isOverkill: boolean;
  didCrit: boolean;
  tookDamage: boolean;
  comboStreak: number;
  battleMomentum: number;
  consecutiveOneHits: number;
  totalCrits: number;
  fightsSinceSpend: number;
  killCount: number;
  caveVisits: number;
  bossesKilled: number;
  dangerStreak: number;
  dangerFights: number;
  waveRemaining: number;
  consecutiveCrits: number;
  fightChainCount: number;
  prestigeCount: number;
  revengeGoldRemaining: number;
  villageBlessingRemaining: number;
  eliteCombo: number;
  uniqueBossKills: number;
  consecutiveEliteKills2: number;
  overkillChain: number;
  consecutiveBossKills: number;
  deathGoldCompound: number;
  consecutiveWaveClears: number;
  totalEliteKills: number;
  totalWins: number;
  goldenHourRemaining: number;
  rushHourActive: boolean;
  hasRelic1: boolean;
  arenaMul: number;
  rngDoubleGold: boolean;
}

export interface GoldRewardResult {
  goldEarned: number;
  greedPenalty: number;
  sacrificeGold: number;
  sacrificeExp: number;
  comboTaxGold: number;
  comboTaxExp: number;
}

export function computeGoldReward(ctx: GoldRewardContext): GoldRewardResult {
  const {
    heroLevel, heroGold, heroHp, heroHpMax,
    isBoss, isElite, isTreasureGoblin, isDangerZone, isOverkill, didCrit, tookDamage,
    comboStreak, battleMomentum, consecutiveOneHits, totalCrits,
    fightsSinceSpend, killCount, caveVisits, bossesKilled, dangerStreak, dangerFights,
    waveRemaining, consecutiveCrits, fightChainCount, prestigeCount,
    revengeGoldRemaining, villageBlessingRemaining, eliteCombo, uniqueBossKills,
    consecutiveEliteKills2, overkillChain, consecutiveBossKills, deathGoldCompound,
    consecutiveWaveClears, totalEliteKills, totalWins, goldenHourRemaining,
    rushHourActive, hasRelic1, arenaMul, rngDoubleGold,
  } = ctx;

  // Multiplier categories
  const goldMul = isBoss ? GOLD_BOSS_MUL : isElite ? GOLD_ELITE_MUL : isTreasureGoblin ? TREASURE_GOBLIN_GOLD_MUL : 1;
  const dangerGoldMul = isDangerZone ? DANGER_ZONE_GOLD_MUL : 1;
  const waveMul = waveRemaining > 0 ? WAVE_BONUS_GOLD_MUL : 1;
  const momentumGoldMul = battleMomentum >= GOLD_MOMENTUM_THRESHOLD ? (1 + GOLD_MOMENTUM_BONUS) : 1;
  const comboGoldMul = comboStreak >= COMBO_GOLD_THRESHOLD ? 1 + (comboStreak - COMBO_GOLD_THRESHOLD) * COMBO_GOLD_BONUS_PER : 1;
  const overkillGoldMul = isOverkill ? (1 + OVERKILL_GOLD_BONUS) : 1;
  const overkillChainMul = 1 + Math.min(OVERKILL_CHAIN_CAP, consecutiveOneHits) * OVERKILL_CHAIN_GOLD_MUL;
  const critGoldScale = Math.min(CRIT_GOLD_SCALE_CAP, Math.floor(totalCrits / 100) * CRIT_GOLD_SCALE_PER_100);
  const critGoldMul = didCrit ? (1 + CRIT_GOLD_BONUS + critGoldScale) : 1;
  const greedGoldMul = heroGold >= GREED_MODE_GOLD_THRESHOLD ? (1 + GREED_MODE_GOLD_BONUS) : 1;
  const revengeGoldMul = revengeGoldRemaining > 0 ? (1 + REVENGE_GOLD_BONUS) : 1;
  const treasureHunterMul = 1 + Math.floor(caveVisits / TREASURE_HUNTER_CAVE_INTERVAL) * TREASURE_HUNTER_GOLD_BONUS;
  const goldStreakMul = fightsSinceSpend >= GOLD_STREAK_THRESHOLD ? (1 + GOLD_STREAK_BONUS) : 1;
  const comboGoldMul2 = comboStreak >= COMBO_GOLD_MUL_THRESHOLD ? (1 + COMBO_GOLD_MUL_BONUS) : 1;
  const comboMilestoneMul = (killCount > 0 && killCount % COMBO_MILESTONE_INTERVAL === 0) ? (1 + COMBO_MILESTONE_GOLD_BONUS) : 1;
  const fullHpGoldMul = (heroHp >= heroHpMax) ? (1 + FULL_HP_GOLD_BONUS) : 1;
  const eliteGoldMul = isElite ? (1 + ELITE_GOLD_BONUS) : 1;
  const goldCascadeMul = consecutiveOneHits >= GOLD_CASCADE_THRESHOLD ? GOLD_CASCADE_MULTIPLIER : 1;
  const villageBlessMul = villageBlessingRemaining > 0 ? (1 + VILLAGE_BLESSING_GOLD_BONUS) : 1;
  const bossGoldMul = 1 + bossesKilled * GOLD_PER_BOSS_BONUS;
  const levelMilestoneGold = Math.floor(heroLevel / GOLD_LEVEL_MILESTONE) * GOLD_LEVEL_MILESTONE_BONUS;
  const dangerScaleMul = 1 + dangerStreak * DANGER_GOLD_SCALE;
  const treasureHoardMul2 = (killCount > 0 && killCount % TREASURE_HOARD_INTERVAL === 0) ? TREASURE_HOARD_MUL : 1;
  const comboGoldHighMul = comboStreak >= COMBO_GOLD_HIGH_THRESHOLD ? COMBO_GOLD_HIGH_MUL : 1;
  const killStreakGoldMul = fightChainCount >= KILL_STREAK_GOLD_THRESHOLD ? (1 + KILL_STREAK_GOLD_BONUS) : 1;
  const goldHarvestMul = !tookDamage ? (1 + GOLD_HARVEST_BONUS) : 1;
  const prestigeGoldMul2 = 1 + prestigeCount * PRESTIGE_GOLD_MUL_BONUS;
  const critGoldFlat = Math.min(GOLD_PER_CRIT_CAP, totalCrits * GOLD_PER_CRIT);
  const waveFinisherMul = (waveRemaining === 1) ? WAVE_FINISHER_GOLD_MUL : 1;
  const doubleGoldMul = rngDoubleGold ? 2 : 1;
  const critGoldBonusMul = didCrit ? CRIT_GOLD_BONUS_MUL : 1;
  const waveGoldSurgeMul = waveRemaining > 0 ? (1 + (WAVE_SIZE - waveRemaining) * WAVE_GOLD_SURGE_PER_KILL) : 1;
  const waveGoldCascadeMul = waveRemaining > 0 ? (1 + (WAVE_SIZE - waveRemaining) * WAVE_GOLD_CASCADE_PER_FIGHT) : 1;
  const comboGoldEscMul = comboStreak >= COMBO_GOLD_ESCALATION_THRESHOLD ? (1 + (comboStreak - COMBO_GOLD_ESCALATION_THRESHOLD) * COMBO_GOLD_ESCALATION_BONUS) : 1;
  const critChainGoldMul = consecutiveCrits > 0 ? (1 + consecutiveCrits * CRIT_CHAIN_GOLD_BONUS) : 1;
  const prestigeGoldMul3 = 1 + prestigeCount * PRESTIGE_GOLD_PER_COUNT;
  const dangerPrestigeMul = (isDangerZone && prestigeCount > 0) ? (1 + prestigeCount * DANGER_PRESTIGE_GOLD_MUL) : 1;
  const dangerMasteryMul = 1 + Math.min(DANGER_MASTERY_CAP, Math.floor(dangerFights / 50) * DANGER_MASTERY_PER_50);
  const dangerGoldStreakMul = isDangerZone ? (1 + dangerStreak * DANGER_GOLD_STREAK_BONUS) : 1;
  const dangerStreakCompoundMul = (isDangerZone && dangerStreak >= DANGER_STREAK_COMPOUND_THRESHOLD) ? (1 + (dangerStreak - DANGER_STREAK_COMPOUND_THRESHOLD) * DANGER_STREAK_GOLD_COMPOUND) : 1;
  const eliteGoldChainMul = isElite && eliteCombo > 1 ? (1 + (eliteCombo - 1) * ELITE_GOLD_CHAIN_BONUS) : 1;
  const bossTrophyGold = uniqueBossKills * BOSS_TROPHY_GOLD_PER_UNIQUE;
  const waveAccumulatorMul = (waveRemaining > 0 && waveRemaining === 1) ? (1 + WAVE_GOLD_ACCUMULATOR_MUL * WAVE_SIZE) : 1;
  const overkillChainExtraMul = 1 + Math.min(OVERKILL_CHAIN_EXTRA_CAP, overkillChain) * OVERKILL_CHAIN_EXTRA_MUL;
  const bossGoldCascadeMul = 1 + consecutiveBossKills * BOSS_GOLD_CASCADE_PER_BOSS;
  const prestigeGoldCascadeMul = 1 + Math.min(PRESTIGE_GOLD_CASCADE_CAP, prestigeCount * PRESTIGE_GOLD_CASCADE_BONUS);
  const deathGoldCompoundMul = 1 + Math.min(DEATH_GOLD_COMPOUND_CAP, deathGoldCompound);
  const comboGoldVelocityMul = comboStreak > 0 ? (1 + comboStreak * COMBO_GOLD_VELOCITY_BONUS) : 1;
  const prestigeDangerGoldMul = (isDangerZone && prestigeCount > 0) ? (1 + prestigeCount * PRESTIGE_DANGER_GOLD_BONUS) : 1;
  const critGoldMasteryMul = 1 + Math.min(CRIT_GOLD_MASTERY_CAP, Math.floor(totalCrits / 50) * CRIT_GOLD_MASTERY_PER_50);
  const comboDangerSynergyMul = (isDangerZone && comboStreak >= COMBO_DANGER_SYNERGY_THRESHOLD) ? (1 + COMBO_DANGER_SYNERGY_MUL) : 1;
  const dangerGoldMasteryMul = isDangerZone ? (1 + Math.min(DANGER_GOLD_MASTERY_CAP, dangerFights * DANGER_GOLD_MASTERY_RATE)) : 1;
  const eliteGoldMasteryMul = 1 + Math.min(ELITE_GOLD_MASTERY_CAP, totalEliteKills * ELITE_GOLD_MASTERY_RATE);
  const prestigeGoldMomentumMul = 1 + Math.min(PRESTIGE_GOLD_MOMENTUM_CAP, prestigeCount * totalWins * PRESTIGE_GOLD_MOMENTUM_RATE / 100);
  const critGoldCascadeMul2 = 1 + Math.min(CRIT_GOLD_CASCADE_CAP - 1, Math.floor(totalCrits / 100) * CRIT_GOLD_CASCADE_RATE);
  const comboPrestigeGoldMul = (comboStreak > 0 && prestigeCount > 0) ? (1 + Math.min(COMBO_PRESTIGE_GOLD_CAP - 1, comboStreak * COMBO_PRESTIGE_GOLD_RATE)) : 1;
  const waveGoldSurgeScale = consecutiveWaveClears > 0 ? (1 + consecutiveWaveClears * WAVE_GOLD_SURGE_SCALE) : 1;
  const eliteGoldCascadeMul2 = 1 + Math.min(ELITE_GOLD_CASCADE_CAP - 1, totalEliteKills * ELITE_GOLD_CASCADE_PER_ELITE);
  const finalMasteryGoldMul = 1 + Math.min(FINAL_MASTERY2_CAP - 1, totalWins * FINAL_MASTERY_RATE);
  const fullHpFortuneMul = heroHp >= heroHpMax ? FULL_HP_FORTUNE_GOLD_MUL : 1;
  const eliteHunterMul = (isElite && consecutiveEliteKills2 >= ELITE_HUNTER_STREAK) ? ELITE_HUNTER_REWARD_MUL : 1;
  const goldenHourGoldMul = goldenHourRemaining > 0 ? GOLDEN_HOUR_GOLD_MUL : 1;
  const rushHourGoldMul = rushHourActive ? RUSH_HOUR_GOLD_MUL : 1;
  const miserPouchGoldMul = hasRelic1 ? MISER_POUCH_GOLD_MUL : 1;

  // Grouped categories
  const goldCoreMuls = goldMul * dangerGoldMul * waveMul * arenaMul * goldenHourGoldMul * rushHourGoldMul * miserPouchGoldMul;
  const goldComboMuls = momentumGoldMul * comboGoldMul * comboGoldMul2 * comboMilestoneMul * comboGoldHighMul * comboGoldEscMul * comboGoldVelocityMul * comboPrestigeGoldMul;
  const goldCombatMuls = overkillGoldMul * overkillChainMul * overkillChainExtraMul * critGoldMul * critGoldBonusMul * critChainGoldMul * critGoldMasteryMul * critGoldCascadeMul2;
  const goldProgressMuls = revengeGoldMul * goldStreakMul * killStreakGoldMul * eliteGoldMul * eliteGoldChainMul * eliteGoldCascadeMul2 * eliteGoldMasteryMul * eliteHunterMul;
  const goldDangerMuls = dangerScaleMul * dangerPrestigeMul * dangerMasteryMul * dangerGoldStreakMul * dangerStreakCompoundMul * dangerGoldMasteryMul * comboDangerSynergyMul * prestigeDangerGoldMul;
  const goldPrestigeMuls = prestigeGoldMul2 * prestigeGoldMul3 * prestigeGoldCascadeMul * prestigeGoldMomentumMul * finalMasteryGoldMul;
  const goldMiscMuls = greedGoldMul * treasureHunterMul * fullHpGoldMul * goldCascadeMul * villageBlessMul * bossGoldMul * treasureHoardMul2 * goldHarvestMul * waveFinisherMul * doubleGoldMul * waveGoldSurgeMul * waveGoldCascadeMul * waveAccumulatorMul * bossGoldCascadeMul * deathGoldCompoundMul * waveGoldSurgeScale * fullHpFortuneMul;

  const goldEarnedRaw = Math.floor(GOLD_PER_KILL_BASE * Math.pow(heroLevel, GOLD_LEVEL_POWER) * goldCoreMuls * goldComboMuls * goldCombatMuls * goldProgressMuls * goldDangerMuls * goldPrestigeMuls * goldMiscMuls) + levelMilestoneGold + critGoldFlat + bossTrophyGold;
  const goldCapped = Math.min(goldEarnedRaw, heroLevel * 2500);
  const goldFloor = comboStreak >= COMBO_GOLD_FLOOR_THRESHOLD ? heroLevel * COMBO_GOLD_FLOOR_PER_LEVEL : 0;
  const goldEarned = Math.max(goldCapped, goldFloor);

  // Side-effect calculations (engine applies these)
  let greedPenalty = 0;
  if (heroGold + goldEarned > GREED_GAMBIT_GOLD_THRESHOLD) {
    greedPenalty = Math.floor(goldEarned * GREED_GAMBIT_GOLD_PENALTY);
  }

  let sacrificeGold = 0;
  let sacrificeExp = 0;
  const effectiveGold = heroGold + goldEarned - greedPenalty;
  if (effectiveGold > 100) {
    sacrificeGold = Math.floor(effectiveGold * SACRIFICE_GOLD_RATE);
    sacrificeExp = sacrificeGold * SACRIFICE_GOLD_EXP_RATIO;
  }

  let comboTaxGold = 0;
  let comboTaxExp = 0;
  if (comboStreak >= COMBO_TAX_THRESHOLD) {
    const taxableGold = effectiveGold - sacrificeGold;
    comboTaxGold = Math.floor(taxableGold * COMBO_TAX_RATE);
    comboTaxExp = Math.floor(comboTaxGold * COMBO_TAX_REWARD_MUL * 10);
  }

  return { goldEarned, greedPenalty, sacrificeGold, sacrificeExp, comboTaxGold, comboTaxExp };
}
