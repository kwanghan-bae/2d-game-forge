import {
  COMBO_END_EXP_THRESHOLD,
  COMBO_END_EXP_PER_COMBO,
  COMBO_PERSIST_RATE,
  DEATH_GOLD_PROTECT_CAP,
  DEATH_GOLD_PROTECT_PER_PRESTIGE,
  DEATH_EXP_SAVE_RATE,
  DEATH_EXP_CASCADE_RATE,
  DEATH_EXP_RECOVERY_PER_DEATH,
  DEATH_GOLD_COMPOUND_PER_DEATH,
  DEATH_GOLD_COMPOUND_CAP,
  DEATH_GOLD_INSURANCE_RATE,
  DEATH_ATK_SURGE_DURATION,
} from './constants-progression';
import {
  GOLD_DEATH_PENALTY,
  GOLD_SAVE_CHANCE,
  DEATH_HP_DECAY_RATE,
  DEATH_STREAK_THRESHOLD,
  MERCY_DURATION,
  DARKNESS_CURSE_DEATHS,
  REVENGE_GOLD_FIGHTS,
} from './constants-combat';
import { DEATH_EXP_RATE } from './constants-economy';
import {
  REVENGE_STREAK_ATK_PER_DEATH,
  REVENGE_STREAK_CAP,
  REVENGE_STREAK_DURATION,
} from './constants-progression';
import {
  HIGH_GOLD_DEATH_THRESHOLD,
  HIGH_GOLD_DEATH_PENALTY_CAP,
} from './constants-events';

export interface DeathPenaltyContext {
  comboStreak: number;
  heroGold: number;
  heroHpMax: number;
  heroLevel: number;
  heroExp: number;
  prestigeCount: number;
  totalDeaths: number;
  deathStreak: number;
  consecutiveDeaths: number;
  goldSaveRoll: boolean;
  revengeStreakPower?: number;
  deathGoldCompound?: number;
}

export interface DeathPenaltyResult {
  newComboStreak: number;
  goldLost: number;
  goldSaved: boolean;
  goldInsurance: number;
  hpDecay: number;
  newHpMax: number;
  expGained: number;
  deathAtkSurgeDuration: number;
  newRevengeStreakPower: number;
  newRevengeStreakRemaining: number;
  newDeathGoldCompound: number;
  newDeathStreak: number;
  newTotalDeaths: number;
  newConsecutiveDeaths: number;
  mercyActivated: boolean;
  mercyDuration: number;
  darknessCursed: boolean;
  revengeGoldFights: number;
}

export function resolveDeathPenalty(ctx: DeathPenaltyContext): DeathPenaltyResult {
  let expGained = 0;

  // C431: combo exp finisher
  if (ctx.comboStreak >= COMBO_END_EXP_THRESHOLD) {
    expGained += ctx.comboStreak * COMBO_END_EXP_PER_COMBO;
  }

  // C406: combo persistence
  const newComboStreak = Math.floor(ctx.comboStreak * COMBO_PERSIST_RATE);

  // C401: revenge streak
  const revengeStreakPower = ctx.revengeStreakPower ?? 0;
  const newRevengeStreakPower = Math.min(REVENGE_STREAK_CAP, revengeStreakPower + REVENGE_STREAK_ATK_PER_DEATH);
  const newRevengeStreakRemaining = REVENGE_STREAK_DURATION;

  // C449: death gold compound
  const deathGoldCompound = ctx.deathGoldCompound ?? 0;
  const newDeathGoldCompound = Math.min(DEATH_GOLD_COMPOUND_CAP, deathGoldCompound + DEATH_GOLD_COMPOUND_PER_DEATH);

  // C147: gold loss on death + C399: prestige gold protection
  const goldProtectRate = Math.min(DEATH_GOLD_PROTECT_CAP, ctx.prestigeCount * DEATH_GOLD_PROTECT_PER_PRESTIGE);
  // C853: High-gold death penalty ramp — scales 10%→20% above 500k gold
  const baseGoldPenalty = GOLD_DEATH_PENALTY;
  const highGoldRamp = ctx.heroGold > HIGH_GOLD_DEATH_THRESHOLD
    ? Math.min(HIGH_GOLD_DEATH_PENALTY_CAP, baseGoldPenalty + (ctx.heroGold - HIGH_GOLD_DEATH_THRESHOLD) / 5_000_000)
    : baseGoldPenalty;
  let goldLost = 0;
  let goldSaved = false;
  if (!ctx.goldSaveRoll) {
    goldLost = Math.floor(ctx.heroGold * highGoldRamp * (1 - goldProtectRate));
  } else {
    goldSaved = true;
  }

  // C477: death gold insurance
  const goldAfterLoss = ctx.heroGold - goldLost;
  const goldInsurance = Math.floor(goldAfterLoss * DEATH_GOLD_INSURANCE_RATE);

  // C181: max HP decay
  const hpDecay = Math.max(1, Math.floor(ctx.heroHpMax * DEATH_HP_DECAY_RATE));
  const newHpMax = Math.max(1, ctx.heroHpMax - hpDecay);

  // C417: death insurance exp
  expGained += Math.floor(ctx.heroLevel * DEATH_EXP_SAVE_RATE * 10);
  // C459: death exp cascade
  expGained += Math.floor(ctx.heroExp * DEATH_EXP_CASCADE_RATE);
  // C487: death exp recovery
  expGained += ctx.totalDeaths * DEATH_EXP_RECOVERY_PER_DEATH;
  // C329: death exp consolation
  expGained += Math.floor(ctx.heroLevel * 10 * DEATH_EXP_RATE);

  // Death counters
  const newDeathStreak = ctx.deathStreak + 1;
  const newTotalDeaths = ctx.totalDeaths + 1;
  const newConsecutiveDeaths = ctx.consecutiveDeaths + 1;

  // Mercy
  let mercyActivated = false;
  let mercyDuration = 0;
  let finalDeathStreak = newDeathStreak;
  if (newDeathStreak >= DEATH_STREAK_THRESHOLD) {
    mercyActivated = true;
    mercyDuration = MERCY_DURATION;
    finalDeathStreak = 0;
  }

  // Darkness curse
  const darknessCursed = newConsecutiveDeaths >= DARKNESS_CURSE_DEATHS;

  return {
    newComboStreak,
    goldLost,
    goldSaved,
    goldInsurance,
    hpDecay,
    newHpMax,
    expGained,
    deathAtkSurgeDuration: DEATH_ATK_SURGE_DURATION,
    newRevengeStreakPower,
    newRevengeStreakRemaining,
    newDeathGoldCompound,
    newDeathStreak: finalDeathStreak,
    newTotalDeaths,
    newConsecutiveDeaths,
    mercyActivated,
    mercyDuration,
    darknessCursed,
    revengeGoldFights: REVENGE_GOLD_FIGHTS,
  };
}
