/**
 * chronoRebirthIntegration.ts — C1145: Chrono Rebirth Drop Rate & Hero Spawner Integration.
 *
 * Connects the Chrono Rebirth prestige mechanics into core gameplay loops:
 * 1. Drop Rate Multiplier Hook: Amplifies drop odds based on active Rebirth Tier (1.1x up to 2.0x).
 * 2. Hero Spawner Override: Elevates starting Hero level (Lv 50 ~ 200), starting gold vault (5M ~ 100M),
 *    and refreshes recomputed stats (HP / ATK).
 * 3. Starting Bonus Resolver: Queries active tier starting parameters cleanly for run transitions.
 */

import type { MetaState } from '../types';
import {
  CHRONO_REBIRTH_TIERS,
  type ChronoRebirthTierId,
  type ChronoRebirthTierDef,
} from './chronoRebirth';
import type { HeroEntity } from '../hero/HeroEntity';

export interface RebirthStartingStats {
  tierId: ChronoRebirthTierId | null;
  startingLevel: number;
  startingGold: number;
  dropRateMultiplier: number;
  chronoEssenceReward: number;
}

/**
 * Resolves the active Rebirth Tier definition from MetaState.
 */
export function getActiveRebirthTierDef(meta: MetaState): ChronoRebirthTierDef | null {
  if (!meta.activeRebirthTier) return null;
  return CHRONO_REBIRTH_TIERS.find(t => t.id === meta.activeRebirthTier) ?? null;
}

/**
 * Returns the drop rate multiplier granted by the player's active Chrono Rebirth tier.
 * Defaults to 1.0 (no amplification) if no rebirth tier is active.
 */
export function getChronoDropMultiplier(meta: MetaState): number {
  const tier = getActiveRebirthTierDef(meta);
  return tier ? tier.dropRateMultiplier : 1.0;
}

/**
 * Applies the Chrono Rebirth drop multiplier to a base drop bonus.
 * e.g., base bonus of 0.10 with 1.5x multiplier becomes 0.15 (+15%).
 */
export function applyChronoDropMultiplier(baseDropBonus: number, meta: MetaState): number {
  const multiplier = getChronoDropMultiplier(meta);
  return Number((baseDropBonus * multiplier).toFixed(4));
}

/**
 * Returns the starting stats for a given rebirth tier ID (or active tier in meta).
 */
export function getRebirthStartingStats(
  tierIdOrMeta: ChronoRebirthTierId | MetaState | null | undefined
): RebirthStartingStats {
  let tier: ChronoRebirthTierDef | null = null;

  if (tierIdOrMeta && typeof tierIdOrMeta === 'object' && 'inventory' in tierIdOrMeta) {
    tier = getActiveRebirthTierDef(tierIdOrMeta as MetaState);
  } else if (typeof tierIdOrMeta === 'string') {
    tier = CHRONO_REBIRTH_TIERS.find(t => t.id === tierIdOrMeta) ?? null;
  }

  if (!tier) {
    return {
      tierId: null,
      startingLevel: 1,
      startingGold: 0,
      dropRateMultiplier: 1.0,
      chronoEssenceReward: 0,
    };
  }

  return {
    tierId: tier.id,
    startingLevel: tier.startingLevel,
    startingGold: tier.startingGold,
    dropRateMultiplier: tier.dropRateMultiplier,
    chronoEssenceReward: tier.chronoEssenceReward,
  };
}

/**
 * Overrides a newly spawned Hero with Chrono Rebirth starting bonuses:
 * - Sets hero.level to startingLevel (if higher than current)
 * - Grants startingGold into hero's gold inventory
 * - Recalculates base and scaled stats (ATK, HP max)
 * - Refills HP to full
 *
 * Returns true if rebirth was applied, false otherwise.
 */
export function applyRebirthToHero(hero: HeroEntity, meta: MetaState): boolean {
  const tier = getActiveRebirthTierDef(meta);
  if (!tier) return false;

  if (hero.level < tier.startingLevel) {
    hero.level = tier.startingLevel;
  }
  hero.gold = (hero.gold ?? 0) + tier.startingGold;
  hero.recomputeStats();
  hero.hp = hero.hpMax;

  return true;
}

/**
 * Calculates adjusted combat/encounter rewards factoring in Chrono Rebirth tier multipliers.
 */
export function calculateRebirthLoot(
  baseGold: number,
  baseExp: number,
  meta: MetaState
): {
  gold: number;
  exp: number;
  dropOddsMultiplier: number;
} {
  const mult = getChronoDropMultiplier(meta);
  return {
    gold: baseGold,
    exp: baseExp,
    dropOddsMultiplier: mult,
  };
}
