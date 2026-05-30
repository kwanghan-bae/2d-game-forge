/**
 * AtkMultiplierCalc — pure computation of ATK multiplier groups.
 * Extracted from EncounterEngine C687.
 * All side effects remain in the engine; this module only reads context.
 */

import {
  MOMENTUM_ATK_BONUS,
  SHRINE_MEDITATION_ATK_BUFF,
  REVENGE_ATK_BONUS,
  KILL_MILESTONE_ATK_BONUS,
  NEAR_DEATH_HP_THRESHOLD,
  NEAR_DEATH_ATK_MUL,
  EXHAUSTION_THRESHOLD,
  EXHAUSTION_ATK_PENALTY,
  SHRINE_TITHE_ATK_BONUS,
  SHIELD_BREAK_ATK_MUL,
  COMBO_BREAKER_ATK_BONUS,
  PRESTIGE_STAT_BONUS,
  ACHIEVEMENT_ATK_BONUS,
  DEATH_ATK_BONUS,
  DEATH_ATK_CAP,
  BERSERKER_HP_THRESHOLD,
  BERSERKER_ATK_BONUS,
  DARKNESS_CURSE_ATK_PENALTY,
  SPEC_ATK_BONUS,
  ELEMENTAL_LEVEL_MOD,
  ELEMENTAL_DMG_BONUS,
  SACRIFICE_FURY_ATK_BONUS,
  STAMINA_PENALTY_CAP,
  STAMINA_FIGHTS_PER_PENALTY,
  STAMINA_ATK_PENALTY,
  GOLD_HOARD_THRESHOLD,
  GOLD_HOARD_ATK_BONUS,
  BOSS_KILL_ATK_INTERVAL,
  BOSS_KILL_ATK_BONUS,
  ADRENALINE_HP_THRESHOLD,
  ADRENALINE_ATK_BONUS,
  VILLAGE_TRAINING_ATK_BONUS,
  PRESTIGE_ATK_BONUS_PER,
  VENGEFUL_SPIRIT_THRESHOLD,
  VENGEFUL_SPIRIT_ATK_BONUS,
  CRIT_CHAIN_CAP,
  CRIT_CHAIN_ATK_BONUS,
  DANGER_ZONE_ATK_BONUS,
  DANGER_ATK_CHAIN_BONUS,
  DANGER_COMBO_ATK_BONUS,
  BOSS_FURY_ATK_BONUS,
  BOSS_FURY_ATK_SCALE,
  FINAL_STAND_HP,
  FINAL_STAND_DMG_MUL,
  BOSS_TROPHY_ATK_BONUS,
  PRESTIGE_SURGE_ATK_MUL,
  VILLAGE_REST_ATK_BONUS,
  WAVE_MOMENTUM_ATK_MUL,
  WAVE_CHAIN_CAP,
  WAVE_CHAIN_ATK_PER_WAVE,
  COMBAT_MASTERY_CAP,
  COMBAT_MASTERY_PER_100,
  DEATH_COUNT_ATK_CAP,
  DEATH_COUNT_ATK_PER_10,
  ELITE_CHAIN_ATK_BONUS,
  COMBO_PRESTIGE_SCALE,
  BOSS_ATK_FURY_CHAIN_CAP,
  BOSS_ATK_FURY_CHAIN_BONUS,
  DEATH_ATK_SURGE_BONUS,
  DANGER_ATK_SCALING_CAP,
  DANGER_ATK_SCALING_RATE,
  WAVE_ATK_COMPOUND_CAP,
  WAVE_ATK_COMPOUND_BONUS,
  DANGER_COMBO_THRESHOLD,
  DANGER_COMBO_ATK_FLAT,
  COMBO_ATK_MILESTONE2_INTERVAL,
  COMBO_ATK_MILESTONE2_BONUS,
  VILLAGE_ATK_TRAINING_BONUS,
  PRESTIGE_ATK_MOMENTUM_CAP,
  PRESTIGE_ATK_MOMENTUM_RATE,
  ELITE_ATK_CHAIN_CAP2,
  ELITE_ATK_CHAIN_BONUS2,
  WEATHER_RAIN_ATK_PENALTY,
  COMBO_PRESTIGE_ATK_FLAT,
  ANTI_SYNERGY_PENALTY,
  BLOOD_FURY_SYNERGY_MUL,
  SYNERGY_COUNT_CAP,
  SYNERGY_COUNT_BONUS,
  SYNERGY_TIER_5_BONUS,
  SYNERGY_TIER_3_BONUS,
  EMBER_CROWN_CAP,
  EMBER_CROWN_ATK_PER_CRIT,
  SCHOLAR_LENS_ATK_PENALTY,
  CURSED_ALTAR_ATK_BUFF,
  DEEP_DANGER_THRESHOLD,
  CONDITIONAL_STACK_CAP,
  CONDITIONAL_STACK_BONUS,
  BOSS_CONDITIONAL_MUL,
  LOW_HP_FURY_THRESHOLD,
  LOW_HP_FURY_ATK_MUL,
  FATIGUE_ONSET,
  FATIGUE_CAP,
  FATIGUE_ATK_PENALTY_PER_FIGHT,
  AGING_CAP,
  AGING_ATK_PENALTY,
  SACRIFICE_PRESTIGE_CAP,
  SACRIFICE_PRESTIGE_RATE,
  DANGER_BET_LOCK_MUL,
  SHIELD_BREAK_BURST_MUL,
  WAVE_EXHAUSTION_ATK_PENALTY,
  PRESTIGE_ECHO_BONUS,
  PRESTIGE_ECHO_DURATION,
  PRESTIGE_ECHO_DECAY,
  SHIELD_SACRIFICE_ATK_MUL,
  ADRENALINE_RUSH_HP_THRESHOLD,
  ADRENALINE_RUSH_ATK_BONUS,
  BLOOD_PACT_RELIC_EFFICIENCY,
  BLOOD_PACT_ATK_BONUS,
  BLOOD_PACT_THRESHOLD,
  INSPIRATION_ATK_BONUS,
  EVENT_MOMENTUM_TIER2_ATK_BONUS,
} from './constants';

export interface AtkMultiplierContext {
  // External/config multipliers
  damping: number;
  bossAtkMul: number;
  realmAtkMul: number;
  // Hero & combat state
  battleMomentum: number;
  shrineBuffActive: boolean;
  isRevengeFight: boolean;
  killMilestones: number;
  hpRatio: number; // hero.hp / hero.hpMax
  fightsSinceVillage: number;
  shrineTithes: number;
  hadShieldBreak: boolean;
  hadComboBreaker: boolean;
  prestigeCount: number;
  achievementMilestones: number;
  totalDeaths: number;
  darknessCursed: boolean;
  heroLevel: number;
  sacrificeFuryActive: boolean;
  heroGold: number;
  bossesKilled: number;
  hpBelowAdrenaline: boolean;
  hadVillageTraining: boolean;
  consecutiveDeaths: number;
  consecutiveCrits: number;
  isDangerZone: boolean;
  comboStreak: number;
  dangerChainCount: number;
  hadBossFury: boolean;
  consecutiveBossKills: number;
  heroHp: number;
  heroHpMax: number;
  uniqueBossKills: number;
  hadPrestigeSurge: boolean;
  hadVillageRestAtk: boolean;
  hadWaveMomentum: boolean;
  hadRevengeStreak: boolean;
  revengeStreakPower: number;
  consecutiveWaveClears: number;
  totalWins: number;
  totalFights: number;
  hadEliteChainAtk: boolean;
  eliteCombo: number;
  hadDeathAtkSurge: boolean;
  dangerFights: number;
  hadVillageAtkTraining: boolean;
  hadPrestigeEcho: boolean;
  prestigeEchoDecay: number;
  hadWaveExhaustion: boolean;
  isElite: boolean;
  hpBelowBloodPact: boolean;
  hpBelowAdrenalineRush: boolean;
  hadShieldSacrifice: boolean;
  hadShieldBreakBurst: boolean;
  dangerBetActive: boolean;
  totalSacrifices: number;
  accumulatorBonus: number;
  heroAge: number;
  temporalPrestigeBonus: number;
  lowHpFury: boolean;
  kind: string;
  deathProximityCrit: number;
  dangerStreak: number;
  isPrestigeReady: boolean;
  activeSynergiesFromBloodFury: boolean;
  activeSynergiesFromElderWisdom: boolean;
  activeSynergiesFromDesperateTrade: boolean;
  antiSynergyActive: boolean;
  goldenHourHighCombo: boolean;
  wealthSacrificeActive: boolean;
  synergyPrestigeBonus: number;
  hasEmberCrown: boolean;
  emberCrownStacks: number;
  hasScholarLens: boolean;
  cursedAltarAtkBuff: boolean;
  eventMomentumAtkActive: boolean; // C793
  inspirationActive: boolean;
  // Flat ATK inputs
  comboPrestigeFlat: number;
  comboMilestoneBonus: number;
  combatMastery: number;
  waveChainAtk: number;
  deathCountAtk: number;
  dangerComboAtk: number;
  comboAtkMilestone: number;
  heroAtk: number;
  weather: 'rain' | 'wind' | 'fog' | null;
  // Relic efficiency modifier for blood pact
  hasBloodPactRelic?: boolean;
}

export interface AtkMultiplierResult {
  flatAtk: number;
  coreMuls: number;
  conditionMuls: number;
  goldMuls: number;
  combatMuls: number;
  progressMuls: number;
  chainMuls: number;
  tradeoffMuls: number;
  systemMuls: number;
}

export function computeAtkMultipliers(ctx: AtkMultiplierContext): AtkMultiplierResult {
  const weatherAtkMul = ctx.weather === 'rain' ? (1 - WEATHER_RAIN_ATK_PENALTY) : 1;
  const momentumMul = 1 + ctx.battleMomentum * MOMENTUM_ATK_BONUS;
  const shrineMul = ctx.shrineBuffActive ? 1 + SHRINE_MEDITATION_ATK_BUFF : 1;
  const revengeMul = ctx.isRevengeFight ? 1 + REVENGE_ATK_BONUS : 1;
  const milestoneMul = 1 + Math.min(ctx.killMilestones, 50) * KILL_MILESTONE_ATK_BONUS;
  const nearDeathMul = ctx.hpRatio < NEAR_DEATH_HP_THRESHOLD ? NEAR_DEATH_ATK_MUL : 1;
  const exhaustionMul = ctx.fightsSinceVillage >= EXHAUSTION_THRESHOLD ? (1 - EXHAUSTION_ATK_PENALTY) : 1;
  const titheMul = 1 + ctx.shrineTithes * SHRINE_TITHE_ATK_BONUS;
  const shieldBreakMul = ctx.hadShieldBreak ? SHIELD_BREAK_ATK_MUL : 1;
  const comboBreakerMul = ctx.hadComboBreaker ? (1 + COMBO_BREAKER_ATK_BONUS) : 1;
  const prestigeMul = 1 + ctx.prestigeCount * PRESTIGE_STAT_BONUS;
  const achieveMul = 1 + ctx.achievementMilestones * ACHIEVEMENT_ATK_BONUS;
  const deathAtkMul = 1 + Math.min(DEATH_ATK_CAP, ctx.totalDeaths * DEATH_ATK_BONUS);
  const berserkerMul = (ctx.heroHp < ctx.heroHpMax * BERSERKER_HP_THRESHOLD) ? (1 + BERSERKER_ATK_BONUS) : 1;
  const curseMul = ctx.darknessCursed ? (1 - DARKNESS_CURSE_ATK_PENALTY) : 1;
  const specMul = ctx.prestigeCount > 0 ? (1 + SPEC_ATK_BONUS) : 1;
  const elementalMul = (ctx.heroLevel % ELEMENTAL_LEVEL_MOD === 0) ? (1 + ELEMENTAL_DMG_BONUS) : 1;
  const furyMul = ctx.sacrificeFuryActive ? (1 + SACRIFICE_FURY_ATK_BONUS) : 1;
  const staminaPenalty = Math.min(STAMINA_PENALTY_CAP, Math.floor(ctx.fightsSinceVillage / STAMINA_FIGHTS_PER_PENALTY) * STAMINA_ATK_PENALTY);
  const staminaMul = 1 - staminaPenalty;
  const goldHoardMul = ctx.heroGold >= GOLD_HOARD_THRESHOLD ? (1 + GOLD_HOARD_ATK_BONUS) : 1;
  const bossKillAtkMul = 1 + Math.floor(ctx.bossesKilled / BOSS_KILL_ATK_INTERVAL) * BOSS_KILL_ATK_BONUS;
  const adrenalineMul = ctx.hpBelowAdrenaline ? (1 + ADRENALINE_ATK_BONUS) : 1;
  const trainingMul = ctx.hadVillageTraining ? (1 + VILLAGE_TRAINING_ATK_BONUS) : 1;
  const prestigeAtkMul = 1 + ctx.prestigeCount * PRESTIGE_ATK_BONUS_PER;
  const vengefulMul = ctx.consecutiveDeaths >= VENGEFUL_SPIRIT_THRESHOLD ? (1 + VENGEFUL_SPIRIT_ATK_BONUS) : 1;
  const critChainMul = 1 + Math.min(CRIT_CHAIN_CAP, ctx.consecutiveCrits * CRIT_CHAIN_ATK_BONUS);
  const dangerComboBonus = ctx.isDangerZone && ctx.comboStreak > 0 ? DANGER_COMBO_ATK_BONUS : 0;
  const dangerAtkMul = ctx.isDangerZone ? (1 + DANGER_ZONE_ATK_BONUS + ctx.dangerChainCount * DANGER_ATK_CHAIN_BONUS + dangerComboBonus) : 1;
  const bossFuryMul = ctx.hadBossFury ? (1 + BOSS_FURY_ATK_BONUS + ctx.consecutiveBossKills * BOSS_FURY_ATK_SCALE) : 1;
  const finalStandMul = ctx.heroHp === FINAL_STAND_HP ? FINAL_STAND_DMG_MUL : 1;
  const bossTrophyMul = 1 + ctx.uniqueBossKills * BOSS_TROPHY_ATK_BONUS;
  const prestigeSurgeMul = ctx.hadPrestigeSurge ? PRESTIGE_SURGE_ATK_MUL : 1;
  const villageRestAtkMul = ctx.hadVillageRestAtk ? (1 + VILLAGE_REST_ATK_BONUS) : 1;
  const waveMomentumAtkMul = ctx.hadWaveMomentum ? (1 + WAVE_MOMENTUM_ATK_MUL) : 1;
  const revengeStreakMul = ctx.hadRevengeStreak ? (1 + ctx.revengeStreakPower) : 1;
  const eliteChainAtkMul = ctx.hadEliteChainAtk ? (1 + ELITE_CHAIN_ATK_BONUS * ctx.eliteCombo) : 1;
  const comboPrestigeSynergyMul = ctx.comboStreak > 0 ? (1 + ctx.prestigeCount * COMBO_PRESTIGE_SCALE) : 1;
  const bossFuryChainMul = 1 + Math.min(BOSS_ATK_FURY_CHAIN_CAP, ctx.consecutiveBossKills * BOSS_ATK_FURY_CHAIN_BONUS);
  const deathAtkSurgeMul = ctx.hadDeathAtkSurge ? (1 + DEATH_ATK_SURGE_BONUS) : 1;
  const dangerAtkScaleMul = 1 + Math.min(DANGER_ATK_SCALING_CAP - 1, ctx.dangerFights * DANGER_ATK_SCALING_RATE);
  const waveAtkCompoundMul = 1 + Math.min(WAVE_ATK_COMPOUND_CAP - 1, ctx.consecutiveWaveClears * WAVE_ATK_COMPOUND_BONUS);
  const villageAtkTrainingMul = ctx.hadVillageAtkTraining ? (1 + VILLAGE_ATK_TRAINING_BONUS) : 1;
  const prestigeAtkMomentumMul = 1 + Math.min(PRESTIGE_ATK_MOMENTUM_CAP - 1, ctx.prestigeCount * ctx.totalWins * PRESTIGE_ATK_MOMENTUM_RATE / 100);
  const eliteAtkChainMul2 = ctx.isElite ? (1 + Math.min(ELITE_ATK_CHAIN_CAP2 - 1, ctx.eliteCombo * ELITE_ATK_CHAIN_BONUS2)) : 1;
  const bloodPactRelicBonus = ctx.hasBloodPactRelic ? BLOOD_PACT_RELIC_EFFICIENCY : 1;
  const bloodPactMul = ctx.hpBelowBloodPact ? (1 + BLOOD_PACT_ATK_BONUS * bloodPactRelicBonus) : 1;
  const adrenalineRushMul = ctx.hpBelowAdrenalineRush ? (1 + ADRENALINE_RUSH_ATK_BONUS) : 1;
  const shieldSacrificeMul = ctx.hadShieldSacrifice ? SHIELD_SACRIFICE_ATK_MUL : 1;
  const prestigeEchoMul = ctx.hadPrestigeEcho ? (1 + PRESTIGE_ECHO_BONUS - ctx.prestigeEchoDecay * PRESTIGE_ECHO_DECAY) : 1;
  const inspirationMul = ctx.inspirationActive ? (1 + INSPIRATION_ATK_BONUS) : 1;
  const eventMomentumAtkMul = ctx.eventMomentumAtkActive ? (1 + EVENT_MOMENTUM_TIER2_ATK_BONUS) : 1;
  const waveExhaustionMul = ctx.hadWaveExhaustion ? (1 - WAVE_EXHAUSTION_ATK_PENALTY) : 1;
  const shieldBreakBurstMul = ctx.hadShieldBreakBurst ? SHIELD_BREAK_BURST_MUL : 1;
  const dangerBetMul = ctx.dangerBetActive ? DANGER_BET_LOCK_MUL : 1;
  const sacrificePrestigeMul = 1 + Math.min(SACRIFICE_PRESTIGE_CAP, ctx.totalSacrifices * SACRIFICE_PRESTIGE_RATE);
  const fatigueMul = ctx.fightsSinceVillage > FATIGUE_ONSET ? (1 - Math.min(FATIGUE_CAP, (ctx.fightsSinceVillage - FATIGUE_ONSET) * FATIGUE_ATK_PENALTY_PER_FIGHT)) : 1;
  const accumulatorMul = 1 + ctx.accumulatorBonus;
  const agingAtkMul = 1 - Math.min(AGING_CAP * AGING_ATK_PENALTY, ctx.heroAge * AGING_ATK_PENALTY);
  const temporalPrestigeMul = 1 + ctx.temporalPrestigeBonus;
  const lowHpFuryMul = ctx.lowHpFury ? LOW_HP_FURY_ATK_MUL : 1;
  const bossConditionalMul = ctx.kind === 'boss' ? BOSS_CONDITIONAL_MUL : 1;

  // Conditional stack
  let activeConditions = 0;
  if (ctx.lowHpFury) activeConditions++;
  if (ctx.heroHp >= ctx.heroHpMax) activeConditions++;
  if (ctx.kind === 'boss') activeConditions++;
  if (ctx.deathProximityCrit > 0) activeConditions++;
  if (ctx.dangerStreak >= DEEP_DANGER_THRESHOLD) activeConditions++;
  if (ctx.isPrestigeReady) activeConditions++;
  const conditionalStackMul = 1 + Math.min(CONDITIONAL_STACK_CAP, activeConditions * CONDITIONAL_STACK_BONUS);

  // Synergy web
  let activeSynergies = 0;
  const bloodFurySynergy = ctx.activeSynergiesFromBloodFury ? BLOOD_FURY_SYNERGY_MUL : 1;
  if (ctx.activeSynergiesFromBloodFury) activeSynergies++;
  if (ctx.activeSynergiesFromElderWisdom) activeSynergies++;
  if (ctx.activeSynergiesFromDesperateTrade) activeSynergies++;
  const antiSynergyPenalty = ctx.antiSynergyActive ? ANTI_SYNERGY_PENALTY : 1;
  if (ctx.goldenHourHighCombo) activeSynergies++;
  if (ctx.wealthSacrificeActive) activeSynergies++;
  const synergyCountMul = 1 + Math.min(SYNERGY_COUNT_CAP, activeSynergies * SYNERGY_COUNT_BONUS);
  const synergyTierMul = activeSynergies >= 5 ? (1 + SYNERGY_TIER_5_BONUS) : activeSynergies >= 3 ? (1 + SYNERGY_TIER_3_BONUS) : 1;
  const synergyPrestigeMul = 1 + ctx.synergyPrestigeBonus;
  const emberCrownMul = ctx.hasEmberCrown ? (1 + Math.min(EMBER_CROWN_CAP, ctx.emberCrownStacks * EMBER_CROWN_ATK_PER_CRIT)) : 1;
  const scholarLensMul = ctx.hasScholarLens ? (1 - SCHOLAR_LENS_ATK_PENALTY) : 1;
  const cursedAltarMulVal = ctx.cursedAltarAtkBuff ? CURSED_ALTAR_ATK_BUFF : 1;

  // Flat ATK (delegating to same formula as CombatCalculator)
  const flatAtk = ctx.heroAtk + ctx.comboPrestigeFlat + ctx.comboMilestoneBonus + ctx.combatMastery + ctx.waveChainAtk + ctx.deathCountAtk + ctx.dangerComboAtk + ctx.comboAtkMilestone;

  // Group multipliers
  const coreMuls = ctx.damping * ctx.bossAtkMul * ctx.realmAtkMul * momentumMul * shrineMul * revengeMul * milestoneMul * prestigeMul * achieveMul;
  const conditionMuls = nearDeathMul * exhaustionMul * titheMul * shieldBreakMul * comboBreakerMul * weatherAtkMul * deathAtkMul * berserkerMul * curseMul * specMul * elementalMul * furyMul * staminaMul * fatigueMul;
  const goldMuls = goldHoardMul * adrenalineMul;
  const combatMuls = bossKillAtkMul * trainingMul * vengefulMul * critChainMul * dangerAtkMul * bossFuryMul * finalStandMul * bossTrophyMul * dangerAtkScaleMul;
  const progressMuls = prestigeAtkMul * prestigeSurgeMul * prestigeAtkMomentumMul * prestigeEchoMul * inspirationMul * eventMomentumAtkMul * sacrificePrestigeMul * temporalPrestigeMul;
  const chainMuls = villageRestAtkMul * waveMomentumAtkMul * revengeStreakMul * eliteChainAtkMul * comboPrestigeSynergyMul * bossFuryChainMul * deathAtkSurgeMul * waveAtkCompoundMul * villageAtkTrainingMul * eliteAtkChainMul2;
  const tradeoffMuls = bloodPactMul * adrenalineRushMul * shieldSacrificeMul * waveExhaustionMul * lowHpFuryMul * bossConditionalMul * conditionalStackMul * shieldBreakBurstMul * dangerBetMul;
  const systemMuls = accumulatorMul * agingAtkMul * bloodFurySynergy * antiSynergyPenalty * synergyCountMul * synergyTierMul * synergyPrestigeMul * emberCrownMul * scholarLensMul * cursedAltarMulVal;

  return { flatAtk, coreMuls, conditionMuls, goldMuls, combatMuls, progressMuls, chainMuls, tradeoffMuls, systemMuls };
}
