/**
 * omniverseRegaliaIntegration.ts — C1163: Omniverse Regalia Equipment Effects & Combat Hook Integration.
 *
 * Integrates the 4 apex Divine Regalia perks into live hero combat calculations:
 * 1. applyRegaliaHpBonus: Expands hero max HP with Ymir Primordial Heart (+100M HP).
 * 2. applyRegaliaDefPenetration: Bypasses enemy armor with Ouroboros Chrono Blade (30% DEF penetration).
 * 3. applyRegaliaIncomingDamage: Absorbs incoming hits with Flat Barrier (-500k) and Elemental Resistance (-20%).
 * 4. applyRegaliaCriticalHit: Computes critical damage amplified by Nyx Void Eye (+100% crit damage).
 * 5. isImmuneToDebuff: Checks status immunity conferred by Aion Singularity Aegis.
 * 6. getRegaliaCombatProfile: Produces a consolidated combat profile.
 */

import type { MetaState } from '../types';
import { evaluateForgedRegaliaPerks, type ForgedRegaliaPerks } from './omniverseRegalia';

export interface RegaliaIncomingDamageResult {
  finalDamage: number;
  absorbedByBarrier: number;
  elementalMitigation: number;
}

export interface RegaliaCriticalHitResult {
  isCritical: boolean;
  damage: number;
  multiplier: number;
}

export interface RegaliaCombatProfile {
  perks: ForgedRegaliaPerks;
  forgedCount: number;
  hasAllRegalia: boolean;
}

/**
 * Applies HP bonus from forged regalia (Ymir Primordial Heart +100M HP).
 */
export function applyRegaliaHpBonus(baseHp: number, meta: MetaState): { maxHp: number; bonusHp: number } {
  const { bonusHp } = evaluateForgedRegaliaPerks(meta);
  return {
    maxHp: baseHp + bonusHp,
    bonusHp,
  };
}

/**
 * Bypasses target DEF based on Ouroboros Chrono Blade (30% penetration).
 */
export function applyRegaliaDefPenetration(enemyDef: number, meta: MetaState): number {
  const { defPenetration } = evaluateForgedRegaliaPerks(meta);
  if (defPenetration <= 0) return enemyDef;
  const effectiveDef = enemyDef * (1 - Math.min(0.90, defPenetration));
  return Math.max(0, Math.round(effectiveDef));
}

/**
 * Mitigates incoming damage via Aion's elemental resistance and Ymir's flat barrier.
 */
export function applyRegaliaIncomingDamage(
  rawDamage: number,
  meta: MetaState,
  isElemental: boolean = false
): RegaliaIncomingDamageResult {
  const { allElementalResistance, flatBarrier } = evaluateForgedRegaliaPerks(meta);

  let damageAfterElement = rawDamage;
  let elementalMitigation = 0;

  if (isElemental && allElementalResistance > 0) {
    const reduced = rawDamage * (1 - allElementalResistance);
    elementalMitigation = rawDamage - reduced;
    damageAfterElement = reduced;
  }

  const effectiveDamage = Math.max(1, Math.round(damageAfterElement - flatBarrier));
  const absorbedByBarrier = Math.max(0, Math.round(damageAfterElement - effectiveDamage));

  return {
    finalDamage: effectiveDamage,
    absorbedByBarrier,
    elementalMitigation: Math.round(elementalMitigation),
  };
}

/**
 * Calculates critical hit damage output factoring in Nyx Void Eye (+100% crit damage bonus).
 */
export function applyRegaliaCriticalHit(
  baseDamage: number,
  isCritical: boolean,
  meta: MetaState
): RegaliaCriticalHitResult {
  if (!isCritical) {
    return {
      isCritical: false,
      damage: baseDamage,
      multiplier: 1.0,
    };
  }

  const { critDamageBonus } = evaluateForgedRegaliaPerks(meta);
  const baseMultiplier = 1.5; // Baseline 150% crit damage
  const totalMultiplier = baseMultiplier + critDamageBonus;
  const damage = Math.round(baseDamage * totalMultiplier);

  return {
    isCritical: true,
    damage,
    multiplier: totalMultiplier,
  };
}

/**
 * Checks whether the player is immune to negative status effects (conferred by Aion Singularity Aegis).
 */
export function isImmuneToDebuff(meta: MetaState): boolean {
  const { debuffImmunity } = evaluateForgedRegaliaPerks(meta);
  return debuffImmunity;
}

/**
 * Returns a consolidated combat profile of all forged regalia.
 */
export function getRegaliaCombatProfile(meta: MetaState): RegaliaCombatProfile {
  const perks = evaluateForgedRegaliaPerks(meta);
  const forged = meta.forgedRegalia ?? [];

  return {
    perks,
    forgedCount: forged.length,
    hasAllRegalia: forged.length >= 4,
  };
}
