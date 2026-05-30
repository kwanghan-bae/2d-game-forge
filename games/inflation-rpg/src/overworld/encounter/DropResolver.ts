/**
 * DropResolver — Pure function for drop chance computation.
 * Extracted from EncounterEngine (C711).
 */
import { OVERKILL_DROP_BONUS, DROP_STREAK_THRESHOLD, ELITE_COMBO_THRESHOLD } from './constants-combat';
import { ELITE_BOSS_SYNERGY_DROP_BONUS } from './constants-progression';

const DROP_RATE = 0.36;

export interface DropChanceContext {
  isBoss: boolean;
  isElite: boolean;
  eliteCombo: number;
  firstBloodUsed: boolean;
  isOverkill: boolean;
  bossSlayerRemaining: number;
  dropChanceBonus: number;
  introDropBonus: number;
  dropStreak: number;
}

export interface DropChanceResult {
  dropOdds: number;
  upgradePool: boolean;
  eliteLootUpgrade: boolean;
}

export function computeDropChance(ctx: DropChanceContext): DropChanceResult {
  const eliteComboGuarantee = ctx.isElite && ctx.eliteCombo >= ELITE_COMBO_THRESHOLD;
  const baseDropOdds = ctx.isBoss
    ? 0.96
    : (ctx.isElite || eliteComboGuarantee)
      ? 1.0
      : !ctx.firstBloodUsed
        ? 1.0
        : DROP_RATE;

  const overkillDropBonus = ctx.isOverkill ? OVERKILL_DROP_BONUS : 0;
  const eliteBossSynergyBonus = (ctx.isElite && ctx.bossSlayerRemaining > 0)
    ? ELITE_BOSS_SYNERGY_DROP_BONUS
    : 0;

  const dropOdds = Math.min(1, baseDropOdds + ctx.dropChanceBonus + ctx.introDropBonus + overkillDropBonus + eliteBossSynergyBonus);
  const upgradePool = !ctx.isBoss && ctx.dropStreak >= DROP_STREAK_THRESHOLD;

  return { dropOdds, upgradePool, eliteLootUpgrade: false };
}
