/**
 * PostCombatHealCalc — Pure function for post-win healing computation.
 * Extracted from EncounterEngine (C710).
 *
 * Sources: base regen, lifesteal, overkill heal, survival heal.
 */
import {
  WIN_HP_REGEN_RATE,
  REGEN_SCALE_PER_50_KILLS,
  REGEN_SCALE_CAP,
  LIFESTEAL_RATE,
  OVERKILL_HEAL_RATE,
} from './constants-combat';
import {
  SURVIVAL_HEAL_THRESHOLD,
  SURVIVAL_HEAL_RATE,
  REGEN_BUFF_VILLAGE_THRESHOLD,
  REGEN_BUFF_MUL,
} from './constants-economy';
import { PRESTIGE_HEAL_BOOST } from './constants-progression';

export interface PostCombatHealContext {
  totalWins: number;
  totalDamageDealt: number;
  villageVisits: number;
  survivalStreak: number;
  isOverkill: boolean;
  prestigeCount: number;
  heroHpMax: number;
}

export interface PostCombatHealResult {
  regenHeal: number;
  lifestealHeal: number;
  overkillHeal: number;
  survivalHeal: number;
  totalHeal: number;
}

export function computePostCombatHeal(ctx: PostCombatHealContext): PostCombatHealResult {
  // Base regen + kill-scaling
  const regenBonus = Math.min(REGEN_SCALE_CAP, Math.floor(ctx.totalWins / 50) * REGEN_SCALE_PER_50_KILLS);
  const regenBase = Math.max(1, Math.floor(ctx.heroHpMax * (WIN_HP_REGEN_RATE + regenBonus)));
  const regenBuffMul = ctx.villageVisits >= REGEN_BUFF_VILLAGE_THRESHOLD ? REGEN_BUFF_MUL : 1;
  const regenHeal = Math.floor(regenBase * regenBuffMul);

  // Lifesteal
  const prestigeHealMul = 1 + ctx.prestigeCount * PRESTIGE_HEAL_BOOST;
  const lifestealHeal = Math.max(1, Math.floor(ctx.totalDamageDealt * LIFESTEAL_RATE * prestigeHealMul));

  // Overkill heal
  const overkillHeal = ctx.isOverkill
    ? Math.max(1, Math.floor(ctx.heroHpMax * OVERKILL_HEAL_RATE))
    : 0;

  // Survival heal
  const survivalHeal = ctx.survivalStreak >= SURVIVAL_HEAL_THRESHOLD
    ? Math.max(1, Math.floor(ctx.heroHpMax * SURVIVAL_HEAL_RATE))
    : 0;

  return {
    regenHeal,
    lifestealHeal,
    overkillHeal,
    survivalHeal,
    totalHeal: regenHeal + lifestealHeal + overkillHeal + survivalHeal,
  };
}
