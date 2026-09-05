/**
 * enchantSystem.ts — C1046: Blacksmith Elemental Rune Enchanting Engine.
 *
 * Allows players to infuse weapons and armor with 4 elemental runes:
 * Fire (화염), Water (빙결), Lightning (뇌전), Dark (암흑).
 *
 * Infusion transforms the equipment's primary element and grants an
 * elemental resonance damage bonus (+15%).
 */

import type { EquipmentInstance } from '../types';
import type { ElementType } from './elementalSystem';
import { getEquipmentElement } from './elementalSystem';

export type RuneType = 'rune_fire' | 'rune_water' | 'rune_lightning' | 'rune_dark';

export interface RuneDef {
  id: RuneType;
  element: ElementType;
  nameKR: string;
  emoji: string;
  color: string;
  description: string;
  costGold: number;
  costStones: number;
  elementalBonusPercent: number; // e.g. 15 for +15%
}

export const ELEMENTAL_RUNES: Record<RuneType, RuneDef> = {
  rune_fire: {
    id: 'rune_fire',
    element: 'fire',
    nameKR: '화염의 룬',
    emoji: '🔥',
    color: '#f87171',
    description: '무기에 작열하는 불꽃의 기운을 각인하여 화(火) 속성을 부여하고 속성 피해 +15%를 얻습니다.',
    costGold: 5000,
    costStones: 10,
    elementalBonusPercent: 15,
  },
  rune_water: {
    id: 'rune_water',
    element: 'water',
    nameKR: '빙결의 룬',
    emoji: '💧',
    color: '#60a5fa',
    description: '무기에 혹한의 냉기를 각인하여 수(水) 속성을 부여하고 속성 피해 +15%를 얻습니다.',
    costGold: 5000,
    costStones: 10,
    elementalBonusPercent: 15,
  },
  rune_lightning: {
    id: 'rune_lightning',
    element: 'lightning',
    nameKR: '뇌전의 룬',
    emoji: '⚡',
    color: '#fbbf24',
    description: '무기에 벼락의 기운을 각인하여 뇌(雷) 속성을 부여하고 속성 피해 +15%를 얻습니다.',
    costGold: 5000,
    costStones: 10,
    elementalBonusPercent: 15,
  },
  rune_dark: {
    id: 'rune_dark',
    element: 'dark',
    nameKR: '암흑의 룬',
    emoji: '🌑',
    color: '#c084fc',
    description: '무기에 심연의 힘을 각인하여 암(暗) 속성을 부여하고 속성 피해 +15%를 얻습니다.',
    costGold: 10000,
    costStones: 15,
    elementalBonusPercent: 15,
  },
};

export const ALL_RUNES: readonly RuneType[] = [
  'rune_fire',
  'rune_water',
  'rune_lightning',
  'rune_dark',
];

/**
 * Gets definition for given rune.
 */
export function getRuneDef(rune: RuneType): RuneDef {
  return ELEMENTAL_RUNES[rune];
}

/**
 * Checks if hero has enough gold and enhance stones to enchant with rune.
 */
export function canEnchantWithRune(
  rune: RuneType,
  availableGold: number,
  availableStones: number,
): boolean {
  const def = getRuneDef(rune);
  return availableGold >= def.costGold && availableStones >= def.costStones;
}

/**
 * Applies a rune enchant to an equipment instance.
 * Returns a new modified EquipmentInstance.
 */
export function applyRuneEnchant(
  instance: EquipmentInstance,
  rune: RuneType,
): EquipmentInstance {
  const def = getRuneDef(rune);
  return {
    ...instance,
    enchantElement: def.element,
  };
}

/**
 * Resolves the effective combat element of an equipment instance.
 * Priority: enchanted rune element > base item intrinsic element > 'neutral'.
 */
export function getEffectiveElement(instance: EquipmentInstance): ElementType {
  if (instance.enchantElement && instance.enchantElement !== 'neutral') {
    return instance.enchantElement;
  }
  return getEquipmentElement(instance.baseId);
}
