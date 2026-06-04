import { getEquipmentBase } from '../data/equipment';
import type { EquipmentInstance, EquipmentSpecialEffect } from '../types';

/**
 * C1001: Collect all special effects from a set of equipped items.
 * Returns an array of active special effects for combat/reward modifiers.
 */
export function getActiveSpecialEffects(equipped: EquipmentInstance[]): EquipmentSpecialEffect[] {
  const effects: EquipmentSpecialEffect[] = [];
  for (const inst of equipped) {
    const base = getEquipmentBase(inst.baseId);
    if (base?.specialEffect) {
      effects.push(base.specialEffect);
    }
  }
  return effects;
}

/** Sum all burst_chance bonuses from equipped special effects. */
export function totalBurstChanceBonus(effects: EquipmentSpecialEffect[]): number {
  return effects
    .filter(e => e.type === 'burst_chance')
    .reduce((sum, e) => sum + (e as { type: 'burst_chance'; bonus: number }).bonus, 0);
}

/** Sum all gold_bonus percentages from equipped special effects. */
export function totalGoldBonus(effects: EquipmentSpecialEffect[]): number {
  return effects
    .filter(e => e.type === 'gold_bonus')
    .reduce((sum, e) => sum + (e as { type: 'gold_bonus'; percent: number }).percent, 0);
}

/** Sum all exp_bonus percentages from equipped special effects. */
export function totalExpBonus(effects: EquipmentSpecialEffect[]): number {
  return effects
    .filter(e => e.type === 'exp_bonus')
    .reduce((sum, e) => sum + (e as { type: 'exp_bonus'; percent: number }).percent, 0);
}

/** Get highest combo_shield threshold from equipped special effects. */
export function comboShieldThreshold(effects: EquipmentSpecialEffect[]): number {
  return effects
    .filter(e => e.type === 'combo_shield')
    .reduce((max, e) => Math.max(max, (e as { type: 'combo_shield'; threshold: number }).threshold), 0);
}
