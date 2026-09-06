/**
 * chronoLoomPerks.ts — C1151: Chrono Loom Dynamic Perks Injection.
 *
 * Connects the active Chrono Loom ranks into combat calculations and loot resolution:
 * 1. Omni-Stat Multiplier: Scales hero base HP, ATK, and DEF up to +50%.
 * 2. Damage Dampening: Mitigates incoming combat damage up to -20%.
 * 3. Fatal Blow Nullification: Triggers singularity barrier once per cycle when lethal damage occurs.
 * 4. Drop Duplication: Duplicates boss loot when duplication check succeeds (up to 30% chance).
 */

import type { MetaState } from '../types';
import { evaluateChronoLoomPerks } from './chronoLoom';

export interface LoomCombatStats {
  hp: number;
  atk: number;
  def: number;
  multiplier: number;
}

/**
 * Amplifies hero base stats according to the Temporal Sovereign loom perk (up to +50%).
 */
export function applyLoomStatsToHero(
  baseHp: number,
  baseAtk: number,
  baseDef: number,
  meta: MetaState
): LoomCombatStats {
  const { omniStatMultiplierBonus } = evaluateChronoLoomPerks(meta);
  const multiplier = 1 + omniStatMultiplierBonus;

  return {
    hp: Math.round(baseHp * multiplier),
    atk: Math.round(baseAtk * multiplier),
    def: Math.round(baseDef * multiplier),
    multiplier,
  };
}

/**
 * Applies universal damage reduction from the Singularity Aegis perk (up to -20%).
 */
export function applyLoomDamageDampening(rawDamage: number, meta: MetaState): number {
  const { damageReduction } = evaluateChronoLoomPerks(meta);
  if (damageReduction <= 0) return rawDamage;
  return Math.max(1, Math.round(rawDamage * (1 - damageReduction)));
}

export interface FatalGuardResult {
  survived: boolean;
  finalHp: number;
  guardTriggered: boolean;
}

/**
 * Evaluates fatal damage mitigation for Rank 5 Singularity Aegis fatal guard.
 * Retains 1 HP upon suffering fatal damage if guard is available and unused this cycle.
 */
export function checkLoomFatalGuard(
  incomingDamage: number,
  currentHp: number,
  meta: MetaState,
  alreadyUsedInCycle: boolean = false
): FatalGuardResult {
  const { fatalGuard } = evaluateChronoLoomPerks(meta);

  if (incomingDamage >= currentHp) {
    if (fatalGuard && !alreadyUsedInCycle) {
      return {
        survived: true,
        finalHp: 1,
        guardTriggered: true,
      };
    }
    return {
      survived: false,
      finalHp: 0,
      guardTriggered: false,
    };
  }

  return {
    survived: true,
    finalHp: currentHp - incomingDamage,
    guardTriggered: false,
  };
}

export interface LootDuplicationResult {
  finalDropCount: number;
  isDuplicated: boolean;
  duplicationChance: number;
}

/**
 * Resolves drop duplication from the Chrono Duplication perk (up to 30% chance).
 * Takes an optional rngRoll in [0, 1) for deterministic testing.
 */
export function resolveLoomLootDuplication(
  dropCount: number,
  meta: MetaState,
  rngRoll?: number
): LootDuplicationResult {
  const { duplicationChance } = evaluateChronoLoomPerks(meta);

  if (duplicationChance <= 0 || dropCount <= 0) {
    return {
      finalDropCount: dropCount,
      isDuplicated: false,
      duplicationChance,
    };
  }

  const roll = rngRoll !== undefined ? rngRoll : Math.random();
  const isDuplicated = roll < duplicationChance;

  return {
    finalDropCount: isDuplicated ? dropCount * 2 : dropCount,
    isDuplicated,
    duplicationChance,
  };
}
