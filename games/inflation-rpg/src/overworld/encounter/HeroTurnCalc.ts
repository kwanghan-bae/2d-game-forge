/**
 * HeroTurnCalc — pure crit resolution + hero ATK per combat turn.
 * Extracted from EncounterEngine combat loop (C719).
 * No side effects, no `this`, fully testable.
 */

export interface HeroTurnInput {
  baseHeroAtk: number;
  canCrit: boolean;
  critStreak: number;
  critStreakGuaranteeThreshold: number;
  berserkerHpThreshold: number;
  heroHpRatio: number;
  berserkerCritBonus: number;
  eliteFuryActive: boolean;
  eliteFuryCritBonus: number;
  isBoss: boolean;
  bossCritBonus: number;
  deathProxCritActive: boolean;
  baseCritChance: number;
  weatherCritMul: number;
  critMasteryBonus: number;
  rngChance: (rate: number) => boolean;
  rngLuckyCrit: () => boolean;
  luckyCritMul: number;
  critDamageMul: number;
  prestigeCount: number;
  prestigeCritDmgBonus: number;
  comboStreak: number;
  comboCritSynergyThreshold: number;
  comboCritDmgBonus: number;
  isDangerZone: boolean;
  dangerCritBonus: number;
  critComboSynergyThreshold: number;
  critComboSynergyBonus: number;
  desperateTradeActive: boolean;
  desperateTradeCritMul: number;
}

export interface HeroTurnResult {
  isCrit: boolean;
  heroAtk: number;
  newCritStreak: number;
}

export function computeHeroTurn(input: HeroTurnInput): HeroTurnResult {
  if (!input.canCrit) {
    return { isCrit: false, heroAtk: input.baseHeroAtk, newCritStreak: 0 };
  }

  const guaranteedCrit = input.critStreak >= input.critStreakGuaranteeThreshold;
  const berserkerCrit = input.heroHpRatio < input.berserkerHpThreshold ? input.berserkerCritBonus : 0;
  const eliteFuryCrit = input.eliteFuryActive ? input.eliteFuryCritBonus : 0;
  const bossCritExtra = input.isBoss ? input.bossCritBonus : 0;

  const totalCritChance = input.baseCritChance * input.weatherCritMul + berserkerCrit + eliteFuryCrit + input.critMasteryBonus + bossCritExtra;
  const isCrit = guaranteedCrit || input.deathProxCritActive || input.rngChance(totalCritChance);

  if (!isCrit) {
    return { isCrit: false, heroAtk: input.baseHeroAtk, newCritStreak: 0 };
  }

  // Crit damage calculation — lazy eval rngLuckyCrit to preserve RNG sequence
  const critBaseMul = input.rngLuckyCrit() ? input.luckyCritMul : input.critDamageMul;
  const prestigeMul = 1 + input.prestigeCount * input.prestigeCritDmgBonus;
  const baseCritAtk = input.baseHeroAtk * critBaseMul * prestigeMul;

  // Conditional multipliers
  const comboCritBonus = input.comboStreak >= input.comboCritSynergyThreshold ? (1 + input.comboCritDmgBonus) : 1;
  const dangerCritBonus = input.isDangerZone ? (1 + input.dangerCritBonus) : 1;
  const critComboSynergy = input.comboStreak >= input.critComboSynergyThreshold ? (1 + input.critComboSynergyBonus) : 1;
  const desperateTradeMul = input.desperateTradeActive ? input.desperateTradeCritMul : 1;

  const heroAtk = Math.floor(baseCritAtk * comboCritBonus * dangerCritBonus * critComboSynergy * desperateTradeMul);

  // Streak management: guaranteed crit consumes streak
  const newCritStreak = guaranteedCrit ? 0 : input.critStreak + 1;

  return { isCrit, heroAtk, newCritStreak };
}
