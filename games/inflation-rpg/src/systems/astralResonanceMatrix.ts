/**
 * astralResonanceMatrix.ts — C1120: Astral Resonance Matrix Harmony Engine.
 *
 * Evaluates set resonance when equipment across 3 slots is infused with distinct Cosmic Affixes:
 * - Tier 1: Dual Astral Harmony (2 distinct affixes):
 *   +5% omni-stats, +5% DEF Pierce
 * - Tier 2: Trinity Astral Harmony (3 distinct affixes):
 *   +10% omni-stats, +10% DEF Pierce, +10% Final DMG, +10% Elemental DMG, +10% Dimensional Evasion
 */

import type { EquipmentInstance } from '../types';
import type { CosmicAffixType } from './cosmicInfusion';

export type HarmonyTier = 0 | 1 | 2;

export interface AstralResonanceState {
  totalAffixes: number;
  distinctAffixes: CosmicAffixType[];
  harmonyTier: HarmonyTier;
  tierNameKR: string;
  hanja: string;
  badge: string;
  omniStatMultiplier: number;
  defPierceBonus: number;
  finalDmgMultiplier: number;
  dimensionalEvasionChance: number;
  elementalBonus: number;
}

/**
 * Computes the Astral Resonance Matrix state based on equipped items.
 */
export function computeAstralResonance(instances: EquipmentInstance[]): AstralResonanceState {
  const activeAffixes = instances
    .map(i => i.cosmicAffix)
    .filter((a): a is CosmicAffixType => Boolean(a));

  const distinctAffixes = Array.from(new Set(activeAffixes));
  const distinctCount = distinctAffixes.length;

  let harmonyTier: HarmonyTier = 0;
  let tierNameKR = '공명 비활성';
  let hanja = '未共鳴';
  let badge = '⚪';
  let omniStatMultiplier = 1.0;
  let defPierceBonus = 0;
  let finalDmgMultiplier = 1.0;
  let dimensionalEvasionChance = 0;
  let elementalBonus = 0;

  if (distinctCount >= 3) {
    harmonyTier = 2;
    tierNameKR = '삼위일체 성간 조화 (Trinity Harmony)';
    hanja = '三位一體星間調和';
    badge = '🌌✨👑';
    omniStatMultiplier = 1.10;
    defPierceBonus = 0.10;
    finalDmgMultiplier = 1.10;
    dimensionalEvasionChance = 0.10;
    elementalBonus = 0.10;
  } else if (distinctCount >= 2) {
    harmonyTier = 1;
    tierNameKR = '이원성 성간 조화 (Dual Harmony)';
    hanja = '二元性星間調和';
    badge = '✨💫';
    omniStatMultiplier = 1.05;
    defPierceBonus = 0.05;
  }

  return {
    totalAffixes: activeAffixes.length,
    distinctAffixes,
    harmonyTier,
    tierNameKR,
    hanja,
    badge,
    omniStatMultiplier,
    defPierceBonus,
    finalDmgMultiplier,
    dimensionalEvasionChance,
    elementalBonus,
  };
}

/**
 * Evaluates whether dimensional evasion nullifies incoming damage.
 */
export function evaluateDimensionalEvasion(
  resState: AstralResonanceState,
  roll: number
): boolean {
  if (resState.dimensionalEvasionChance <= 0) return false;
  return roll < resState.dimensionalEvasionChance;
}
