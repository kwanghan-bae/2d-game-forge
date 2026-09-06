/**
 * astralArchivePerks.ts — C1139: Dynamic Injection of Archive Mastery Perks.
 *
 * Exposes utility functions to dynamically apply the account-wide Archive Mastery
 * multipliers into combat stats (HP, ATK, DEF, Crit DMG) and progression yields (Gold, EXP).
 */

import type { MetaState } from '../types';
import { evaluateArchiveMastery, type ArchiveMasteryPerks } from './astralArchive';

export interface BaseHeroStats {
  hpMax: number;
  atk: number;
  def: number;
  critMultiplier?: number;
}

export interface ArchiveEnhancedStats {
  hpMax: number;
  atk: number;
  def: number;
  critMultiplier: number;
  perks: ArchiveMasteryPerks;
}

/**
 * Amplifies hero combat stats using account-wide Archive Mastery bonuses.
 */
export function applyArchiveCombatStats(
  baseStats: BaseHeroStats,
  meta: MetaState
): ArchiveEnhancedStats {
  const { perks } = evaluateArchiveMastery(meta);
  const omni = perks.omniStatMultiplier;
  const critBonus = perks.critDmgBonusPercent / 100;

  return {
    hpMax: Math.round(baseStats.hpMax * omni),
    atk: Math.round(baseStats.atk * omni),
    def: Math.round(baseStats.def * omni),
    critMultiplier: Math.round(((baseStats.critMultiplier ?? 1.5) + critBonus) * 100) / 100,
    perks,
  };
}

/**
 * Multiplies gold rewards by the Archive Mastery gold bonus percentage.
 */
export function applyArchiveGoldMultiplier(baseGold: number, meta: MetaState): number {
  if (baseGold <= 0) return 0;
  const { perks } = evaluateArchiveMastery(meta);
  return Math.round(baseGold * (1 + perks.goldBonusPercent / 100));
}

/**
 * Multiplies experience rewards by the Archive Mastery exp bonus percentage.
 */
export function applyArchiveExpMultiplier(baseExp: number, meta: MetaState): number {
  if (baseExp <= 0) return 0;
  const { perks } = evaluateArchiveMastery(meta);
  return Math.round(baseExp * (1 + perks.expBonusPercent / 100));
}
