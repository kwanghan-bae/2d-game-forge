/**
 * celestialGemCarving.ts — C1087: Four-Elemental Celestial Gem Carving & Trigger Transcendence Engine.
 *
 * Implements an endgame socketing & trigger system using celestial gems:
 * - 4 Elements:
 *   1. fire_ruby (홍련의 겁화석) — On-Hit: 20% chance for Inferno Eruption (+150% elemental burst damage)
 *   2. water_sapphire (창해의 빙정석) — On-Damaged: 15% chance for Glacial Aegis (25% damage reduction & 10% heal)
 *   3. lightning_topaz (뇌정의 벽력석) — On-Hit: 25% chance for Thunder Static (+20% vulnerable enemy damage amp)
 *   4. dark_amethyst (극야의 명혼석) — On-Hit: 15% chance for Void Leech (10% lifesteal & shield)
 * - 4 Tier Progression:
 *   Normal (1.0x) -> Rare (1.3x) -> Legendary (1.7x) -> Mythic (2.2x)
 */

import type { ElementType } from './elementalSystem';

export type GemType = 'fire_ruby' | 'water_sapphire' | 'lightning_topaz' | 'dark_amethyst';
export type GemTier = 'normal' | 'rare' | 'legendary' | 'mythic';

export interface GemDefinition {
  type: GemType;
  element: ElementType;
  nameKR: string;
  hanja: string;
  emoji: string;
  color: string;
  description: string;
  triggerType: 'on_hit' | 'on_damaged';
  baseTriggerChance: number;
  effectDescription: string;
}

export interface GemTierDefinition {
  tier: GemTier;
  tierNameKR: string;
  potencyMultiplier: number;
  costShards: number;
  costCrackStones: number;
  costGold: number;
}

export interface CarvedGem {
  type: GemType;
  tier: GemTier;
}

export const GEM_DEFINITIONS: Record<GemType, GemDefinition> = {
  fire_ruby: {
    type: 'fire_ruby',
    element: 'fire',
    nameKR: '홍련의 겁화석',
    hanja: '紅蓮劫火石',
    emoji: '🔥💎',
    color: '#ef4444',
    description: '영원히 꺼지지 않는 업화의 불길이 응축된 보옥입니다.',
    triggerType: 'on_hit',
    baseTriggerChance: 0.20,
    effectDescription: '타격 시 20% 확률로 겁화 폭발 (+150% 원소 추가 폭격)',
  },
  water_sapphire: {
    type: 'water_sapphire',
    element: 'water',
    nameKR: '창해의 빙정석',
    hanja: '滄海氷晶石',
    emoji: '❄️💎',
    color: '#3b82f6',
    description: '심해의 차가운 영기(靈氣)가 서려 있는 빙결 보옥입니다.',
    triggerType: 'on_damaged',
    baseTriggerChance: 0.15,
    effectDescription: '피격 시 15% 확률로 빙결 방벽 전개 (피해 25% 추가 경감 및 10% 회복)',
  },
  lightning_topaz: {
    type: 'lightning_topaz',
    element: 'lightning',
    nameKR: '뇌정의 벽력석',
    hanja: '雷霆霹靂石',
    emoji: '⚡💎',
    color: '#eab308',
    description: '구천(九天)의 천둥번개가 깃들어 적을 감전시키는 보옥입니다.',
    triggerType: 'on_hit',
    baseTriggerChance: 0.25,
    effectDescription: '타격 시 25% 확률로 감전 상태 부여 (적 받는 피해 20% 증폭)',
  },
  dark_amethyst: {
    type: 'dark_amethyst',
    element: 'dark',
    nameKR: '극야의 명혼석',
    hanja: '極夜冥魂石',
    emoji: '🌑💎',
    color: '#a855f7',
    description: '태초의 어둠과 심연의 망령을 거느린 흡혼 보옥입니다.',
    triggerType: 'on_hit',
    baseTriggerChance: 0.15,
    effectDescription: '타격 시 15% 확률로 명혼 흡수 (입힌 피해의 10% 생명력 흡혈)',
  },
};

export const GEM_TIER_DEFINITIONS: Record<GemTier, GemTierDefinition> = {
  normal: {
    tier: 'normal',
    tierNameKR: '하급',
    potencyMultiplier: 1.0,
    costShards: 30,
    costCrackStones: 3,
    costGold: 50000,
  },
  rare: {
    tier: 'rare',
    tierNameKR: '중급',
    potencyMultiplier: 1.3,
    costShards: 50,
    costCrackStones: 6,
    costGold: 100000,
  },
  legendary: {
    tier: 'legendary',
    tierNameKR: '상급',
    potencyMultiplier: 1.7,
    costShards: 90,
    costCrackStones: 12,
    costGold: 200000,
  },
  mythic: {
    tier: 'mythic',
    tierNameKR: '신화',
    potencyMultiplier: 2.2,
    costShards: 150,
    costCrackStones: 25,
    costGold: 500000,
  },
};

export const NEXT_GEM_TIER: Partial<Record<GemTier, GemTier>> = {
  normal: 'rare',
  rare: 'legendary',
  legendary: 'mythic',
};

/**
 * Calculates effective trigger chance and bonus potency.
 */
export function getEffectiveGemEffect(gem: CarvedGem): {
  triggerChance: number;
  potencyMultiplier: number;
  triggerType: 'on_hit' | 'on_damaged';
  displayName: string;
} {
  const def = GEM_DEFINITIONS[gem.type];
  const tierDef = GEM_TIER_DEFINITIONS[gem.tier];
  const potencyMultiplier = tierDef.potencyMultiplier;
  const triggerChance = Math.min(0.50, def.baseTriggerChance * (1 + (potencyMultiplier - 1) * 0.25));

  return {
    triggerChance,
    potencyMultiplier,
    triggerType: def.triggerType,
    displayName: `[${tierDef.tierNameKR}] ${def.nameKR}`,
  };
}

/**
 * Checks if player can carve a new gem.
 */
export function canCarveGem(
  shards: number,
  crackStones: number,
  gold: number,
  tier: GemTier = 'normal',
): boolean {
  const tierDef = GEM_TIER_DEFINITIONS[tier];
  return (
    shards >= tierDef.costShards &&
    crackStones >= tierDef.costCrackStones &&
    gold >= tierDef.costGold
  );
}

/**
 * Evaluates whether player can upgrade a gem to next tier.
 */
export function canUpgradeGem(
  gem: CarvedGem,
  shards: number,
  crackStones: number,
  gold: number,
): boolean {
  const nextTier = NEXT_GEM_TIER[gem.tier];
  if (!nextTier) return false;
  const nextDef = GEM_TIER_DEFINITIONS[nextTier];
  return (
    shards >= nextDef.costShards &&
    crackStones >= nextDef.costCrackStones &&
    gold >= nextDef.costGold
  );
}

/**
 * Upgrades a carved gem to the next tier if affordable.
 */
export function upgradeCarvedGem(
  gem: CarvedGem,
  shards: number,
  crackStones: number,
  gold: number,
): {
  success: boolean;
  upgradedGem: CarvedGem;
  shardsSpent: number;
  crackStonesSpent: number;
  goldSpent: number;
  message: string;
} {
  const nextTier = NEXT_GEM_TIER[gem.tier];
  if (!nextTier) {
    return {
      success: false,
      upgradedGem: gem,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '이미 최고 등급(신화)에 도달한 보옥입니다.',
    };
  }

  const nextDef = GEM_TIER_DEFINITIONS[nextTier];
  if (shards < nextDef.costShards || crackStones < nextDef.costCrackStones || gold < nextDef.costGold) {
    return {
      success: false,
      upgradedGem: gem,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '보옥 승급에 필요한 재화가 부족합니다.',
    };
  }

  return {
    success: true,
    upgradedGem: { type: gem.type, tier: nextTier },
    shardsSpent: nextDef.costShards,
    crackStonesSpent: nextDef.costCrackStones,
    goldSpent: nextDef.costGold,
    message: `축하합니다! 보옥이 [${nextDef.tierNameKR}] 등급으로 승급되었습니다!`,
  };
}

/**
 * Calculates combat on-hit trigger outcome.
 */
export function evaluateGemOnHitTrigger(
  gem: CarvedGem,
  baseDamage: number,
  roll: number = Math.random(),
): {
  triggered: boolean;
  bonusDamage: number;
  damageAmpPercent: number;
  lifeLeech: number;
  description: string;
} {
  const effect = getEffectiveGemEffect(gem);
  if (effect.triggerType !== 'on_hit' || roll > effect.triggerChance) {
    return { triggered: false, bonusDamage: 0, damageAmpPercent: 0, lifeLeech: 0, description: '' };
  }

  if (gem.type === 'fire_ruby') {
    // +150% elemental burst * potency
    const bonusDamage = Math.floor(baseDamage * 1.5 * effect.potencyMultiplier);
    return {
      triggered: true,
      bonusDamage,
      damageAmpPercent: 0,
      lifeLeech: 0,
      description: `🔥 [겁화 폭발 발동] +${bonusDamage.toLocaleString()} 원소 추가 폭격!`,
    };
  }

  if (gem.type === 'lightning_topaz') {
    // 20% * potency damage amp
    const damageAmpPercent = 20 * effect.potencyMultiplier;
    return {
      triggered: true,
      bonusDamage: 0,
      damageAmpPercent,
      lifeLeech: 0,
      description: `⚡ [뇌정 감전 발동] 적에게 가하는 피해 +${damageAmpPercent.toFixed(0)}% 증폭!`,
    };
  }

  if (gem.type === 'dark_amethyst') {
    // 10% * potency life leech
    const leechRatio = 0.10 * effect.potencyMultiplier;
    const lifeLeech = Math.floor(baseDamage * leechRatio);
    return {
      triggered: true,
      bonusDamage: 0,
      damageAmpPercent: 0,
      lifeLeech,
      description: `🌑 [명혼 흡수 발동] 적의 생명력 ${lifeLeech.toLocaleString()} 흡혈!`,
    };
  }

  return { triggered: false, bonusDamage: 0, damageAmpPercent: 0, lifeLeech: 0, description: '' };
}

/**
 * Calculates combat on-damaged trigger outcome.
 */
export function evaluateGemOnDamagedTrigger(
  gem: CarvedGem,
  incomingDamage: number,
  heroMaxHp: number,
  roll: number = Math.random(),
): {
  triggered: boolean;
  absorbedDamage: number;
  healAmount: number;
  description: string;
} {
  const effect = getEffectiveGemEffect(gem);
  if (effect.triggerType !== 'on_damaged' || roll > effect.triggerChance) {
    return { triggered: false, absorbedDamage: 0, healAmount: 0, description: '' };
  }

  if (gem.type === 'water_sapphire') {
    const drRatio = Math.min(0.60, 0.25 * effect.potencyMultiplier);
    const absorbedDamage = Math.floor(incomingDamage * drRatio);
    const healRatio = 0.10 * effect.potencyMultiplier;
    const healAmount = Math.floor(heroMaxHp * healRatio);

    return {
      triggered: true,
      absorbedDamage,
      healAmount,
      description: `❄️ [빙결 방벽 발동] 피해 ${absorbedDamage.toLocaleString()} 경감 및 HP +${healAmount.toLocaleString()} 회복!`,
    };
  }

  return { triggered: false, absorbedDamage: 0, healAmount: 0, description: '' };
}
