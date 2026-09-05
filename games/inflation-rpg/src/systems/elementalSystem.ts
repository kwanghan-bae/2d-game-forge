/**
 * elementalSystem.ts — C1039: 4대 속성 상성(Elemental Affinities) 매트릭스 엔진.
 *
 * Core mechanics:
 * 1. 4 Elements: Fire (화), Water (수), Lightning (뇌), Dark (암) + Neutral (무).
 * 2. Affinity Triangle:
 *    - Fire > Lightning > Water > Fire (1.5x damage on advantage, 0.7x on disadvantage).
 *    - Dark (암) deals 1.25x damage to elemental targets and takes 1.25x damage (high risk / reward).
 * 3. Equipment & Monster element bindings.
 */

export type ElementType = 'fire' | 'water' | 'lightning' | 'dark' | 'neutral';

export type AffinityRelation = 'weakness' | 'resistance' | 'neutral' | 'dark_clash';

export interface ElementMeta {
  type: ElementType;
  nameKR: string;
  emoji: string;
  color: string;
  description: string;
}

export const ELEMENT_METAS: Record<ElementType, ElementMeta> = {
  fire: {
    type: 'fire',
    nameKR: '화(火)',
    emoji: '🔥',
    color: '#f87171',
    description: '뇌(雷) 속성에 강하고, 수(水) 속성에 약합니다.',
  },
  water: {
    type: 'water',
    nameKR: '수(水)',
    emoji: '💧',
    color: '#60a5fa',
    description: '화(火) 속성에 강하고, 뇌(雷) 속성에 약합니다.',
  },
  lightning: {
    type: 'lightning',
    nameKR: '뇌(雷)',
    emoji: '⚡',
    color: '#fbbf24',
    description: '수(水) 속성에 강하고, 화(火) 속성에 약합니다.',
  },
  dark: {
    type: 'dark',
    nameKR: '암(暗)',
    emoji: '🌑',
    color: '#c084fc',
    description: '모든 3원소에게 1.25배 치명적이나, 자신도 1.25배 피해를 입습니다.',
  },
  neutral: {
    type: 'neutral',
    nameKR: '무(無)',
    emoji: '⚪',
    color: '#9ca3af',
    description: '상성 영향이 없는 균형 잡힌 기본 속성입니다.',
  },
};

/**
 * Elemental Affinity Matrix:
 * attacker -> defender -> multiplier
 */
export const WEAKNESS_MULTIPLIER = 1.5;
export const RESISTANCE_MULTIPLIER = 0.7;
export const DARK_CLASH_MULTIPLIER = 1.25;
export const NEUTRAL_MULTIPLIER = 1.0;

/**
 * Computes damage multiplier for an attack from attackerElement against defenderElement.
 */
export function computeElementalMultiplier(
  attacker: ElementType,
  defender: ElementType,
): number {
  if (attacker === 'neutral' || defender === 'neutral') {
    return NEUTRAL_MULTIPLIER;
  }

  // 3-way elemental cycle
  if (attacker === 'fire' && defender === 'lightning') return WEAKNESS_MULTIPLIER;
  if (attacker === 'lightning' && defender === 'water') return WEAKNESS_MULTIPLIER;
  if (attacker === 'water' && defender === 'fire') return WEAKNESS_MULTIPLIER;

  // Disadvantage
  if (attacker === 'lightning' && defender === 'fire') return RESISTANCE_MULTIPLIER;
  if (attacker === 'water' && defender === 'lightning') return RESISTANCE_MULTIPLIER;
  if (attacker === 'fire' && defender === 'water') return RESISTANCE_MULTIPLIER;

  // Dark interactions
  if (attacker === 'dark' && defender !== 'dark') return DARK_CLASH_MULTIPLIER;
  if (attacker !== 'dark' && defender === 'dark') return DARK_CLASH_MULTIPLIER;

  // Same element (fire vs fire, dark vs dark, etc.)
  return NEUTRAL_MULTIPLIER;
}

/**
 * Evaluates the affinity relation between attacker and defender.
 */
export function getAffinityRelation(
  attacker: ElementType,
  defender: ElementType,
): AffinityRelation {
  const mul = computeElementalMultiplier(attacker, defender);
  if (mul === WEAKNESS_MULTIPLIER) return 'weakness';
  if (mul === RESISTANCE_MULTIPLIER) return 'resistance';
  if (mul === DARK_CLASH_MULTIPLIER) return 'dark_clash';
  return 'neutral';
}

/**
 * Equipment default element mapping based on weapon/armor baseId.
 */
export const EQUIPMENT_ELEMENTS: Record<string, ElementType> = {
  // Fire gear
  'w-bluedragon': 'fire',
  'a-dragon': 'fire',
  'acc-burst-charm': 'fire',
  // Water gear
  'w-fairy': 'water',
  'a-celestial': 'water',
  'w-trident': 'water',
  'a-shell-armor': 'water',
  // Lightning gear
  'w-yongcheon': 'lightning',
  'w-mythic-bow': 'lightning',
  'acc-gold-magnet': 'lightning',
  // Dark gear
  'w-soulreaper': 'dark',
  'acc-chaos-orb': 'dark',
  'a-mythic-robe': 'dark',
};

/**
 * Enemy and Boss default element mapping.
 */
export const ENEMY_ELEMENTS: Record<string, ElementType> = {
  // Fire enemies/bosses
  fire_titan: 'fire',
  flame_golem: 'fire',
  magma_beast: 'fire',
  volcano_drake: 'fire',
  // Water enemies/bosses
  sea_serpent: 'water',
  water_spirit: 'water',
  frost_giant: 'water',
  ice_wraith: 'water',
  // Lightning enemies/bosses
  dragon_lord: 'lightning',
  thunder_bird: 'lightning',
  storm_elemental: 'lightning',
  spark_sprite: 'lightning',
  // Dark enemies/bosses
  dark_lord: 'dark',
  shadow_reaper: 'dark',
  abyssal_stalker: 'dark',
  void_horror: 'dark',
};

/**
 * Resolves equipment base ID to element, default 'neutral'.
 */
export function getEquipmentElement(baseId?: string): ElementType {
  if (!baseId) return 'neutral';
  return EQUIPMENT_ELEMENTS[baseId] ?? 'neutral';
}

/**
 * Resolves enemy/boss ID to element, default 'neutral'.
 */
export function getEnemyElement(enemyId?: string): ElementType {
  if (!enemyId) return 'neutral';
  return ENEMY_ELEMENTS[enemyId] ?? 'neutral';
}
