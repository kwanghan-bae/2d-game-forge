/**
 * primordialResonance.ts — C1132: Primordial Resonance Harmonizer & Combat Phase Integration.
 *
 * Harmonizes the 4 Primordial Constellations into tiered Resonance states,
 * dynamically applying omni-stat boosts, DEF-to-ATK conversion, and battle-start
 * absolute barriers across all combat engines.
 */

import type { PrimordialNodeId } from './primordialAscension';
import {
  computeCumulativePrimordialBonuses,
  getPrimordialTotalRanks,
  type PrimordialBonuses,
} from './primordialAscension';

export type PrimordialResonanceTier =
  | 'none'
  | 'genesis_spark'
  | 'cosmic_alignment'
  | 'primordial_zenith'
  | 'sovereign_singularity';

export interface PrimordialResonanceState {
  tier: PrimordialResonanceTier;
  tierNameKR: string;
  totalRanks: number;
  omniStatMultiplier: number;
  bonusDefPierce: number;
  bonusFinalDmgMultiplier: number;
  bonusElementalAffinity: number;
  bonuses: PrimordialBonuses;
}

export const PRIMORDIAL_TIER_THRESHOLDS: Array<{
  tier: PrimordialResonanceTier;
  tierNameKR: string;
  minRanks: number;
  omniStatMultiplier: number;
  bonusDefPierce: number;
  bonusFinalDmgMultiplier: number;
  bonusElementalAffinity: number;
}> = [
  {
    tier: 'sovereign_singularity',
    tierNameKR: '태초의 절대 지배신 (Sovereign Singularity)',
    minRanks: 18,
    omniStatMultiplier: 1.15,
    bonusDefPierce: 0.15,
    bonusFinalDmgMultiplier: 1.10,
    bonusElementalAffinity: 0.10,
  },
  {
    tier: 'primordial_zenith',
    tierNameKR: '원초의 정점 (Primordial Zenith)',
    minRanks: 12,
    omniStatMultiplier: 1.10,
    bonusDefPierce: 0.10,
    bonusFinalDmgMultiplier: 1.05,
    bonusElementalAffinity: 0.05,
  },
  {
    tier: 'cosmic_alignment',
    tierNameKR: '우주적 정렬 (Cosmic Alignment)',
    minRanks: 6,
    omniStatMultiplier: 1.05,
    bonusDefPierce: 0.05,
    bonusFinalDmgMultiplier: 1.0,
    bonusElementalAffinity: 0.0,
  },
  {
    tier: 'genesis_spark',
    tierNameKR: '창세의 불씨 (Genesis Spark)',
    minRanks: 1,
    omniStatMultiplier: 1.02,
    bonusDefPierce: 0.0,
    bonusFinalDmgMultiplier: 1.0,
    bonusElementalAffinity: 0.0,
  },
];

/**
 * Computes the harmonized Primordial Resonance state from awakened ranks.
 */
export function computePrimordialResonance(
  ranks: Partial<Record<PrimordialNodeId, number>>
): PrimordialResonanceState {
  const totalRanks = getPrimordialTotalRanks(ranks);
  const bonuses = computeCumulativePrimordialBonuses(ranks);

  const matchedTier = PRIMORDIAL_TIER_THRESHOLDS.find(t => totalRanks >= t.minRanks);

  if (!matchedTier) {
    return {
      tier: 'none',
      tierNameKR: '미각성',
      totalRanks: 0,
      omniStatMultiplier: 1.0,
      bonusDefPierce: 0,
      bonusFinalDmgMultiplier: 1.0,
      bonusElementalAffinity: 0,
      bonuses,
    };
  }

  return {
    tier: matchedTier.tier,
    tierNameKR: matchedTier.tierNameKR,
    totalRanks,
    omniStatMultiplier: matchedTier.omniStatMultiplier,
    bonusDefPierce: matchedTier.bonusDefPierce,
    bonusFinalDmgMultiplier: matchedTier.bonusFinalDmgMultiplier,
    bonusElementalAffinity: matchedTier.bonusElementalAffinity,
    bonuses,
  };
}

export interface HeroRawCombatStats {
  hpMax: number;
  atk: number;
  def: number;
  dr?: number;
  defPierce?: number;
  elementalAffinity?: number;
  finalDmgMultiplier?: number;
}

export interface HarmonizedCombatStats {
  effectiveHpMax: number;
  effectiveAtk: number;
  effectiveDef: number;
  effectiveDR: number;
  effectiveDefPierce: number;
  effectiveElementalAffinity: number;
  effectiveFinalDmgMultiplier: number;
  barrierTurns: number;
  resonanceTier: PrimordialResonanceTier;
  resonanceTierName: string;
}

/**
 * Injects harmonized primordial resonance and node bonuses into combat stats.
 */
export function harmonizeHeroCombatStats(
  heroStats: HeroRawCombatStats,
  ranks: Partial<Record<PrimordialNodeId, number>>
): HarmonizedCombatStats {
  const resonance = computePrimordialResonance(ranks);
  const b = resonance.bonuses;

  // 1. DEF-to-ATK conversion
  const convertedAtk = Math.round(heroStats.def * b.defToAtkRatio);
  const baseAtkWithConversion = heroStats.atk + convertedAtk;

  // 2. Omni-stat scaling
  const effectiveHpMax = Math.round(heroStats.hpMax * b.hpMultiplier * resonance.omniStatMultiplier);
  const effectiveAtk = Math.round(baseAtkWithConversion * resonance.omniStatMultiplier);
  const effectiveDef = Math.round(heroStats.def * resonance.omniStatMultiplier);

  // 3. Percentage attributes with strict caps
  const effectiveDR = Math.min(0.90, (heroStats.dr ?? 0) + b.damageReductionBonus);
  const effectiveDefPierce = Math.min(
    0.95,
    (heroStats.defPierce ?? 0) + b.defPierceBonus + resonance.bonusDefPierce
  );
  const effectiveElementalAffinity =
    (heroStats.elementalAffinity ?? 0) + b.elementalAffinityBonus + resonance.bonusElementalAffinity;
  const effectiveFinalDmgMultiplier =
    (heroStats.finalDmgMultiplier ?? 1.0) * b.finalDmgMultiplier * resonance.bonusFinalDmgMultiplier;

  return {
    effectiveHpMax,
    effectiveAtk,
    effectiveDef,
    effectiveDR,
    effectiveDefPierce,
    effectiveElementalAffinity,
    effectiveFinalDmgMultiplier,
    barrierTurns: b.barrierTurns,
    resonanceTier: resonance.tier,
    resonanceTierName: resonance.tierNameKR,
  };
}
