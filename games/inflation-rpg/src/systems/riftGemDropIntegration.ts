/**
 * riftGemDropIntegration.ts — C1091: Endless Chaos Rift Celestial Gem Drop Integration Engine.
 *
 * Integrates procedural gem ore and carved gem drops into deep Chaos Rift clears (Depth 10+):
 * - Depth 10 ~ 19: 20% chance to drop Normal tier gem matching guardian's element.
 * - Depth 20 ~ 29: 30% chance to drop Rare tier gem.
 * - Depth 30 ~ 49: 45% chance to drop Legendary tier gem.
 * - Depth 50+: Guaranteed (100%) Mythic tier celestial gem drop!
 */

import type { ElementType } from './elementalSystem';
import type { GemType, GemTier, CarvedGem } from './celestialGemCarving';
import { GEM_DEFINITIONS, GEM_TIER_DEFINITIONS } from './celestialGemCarving';

export interface RiftGemDropResult {
  dropped: boolean;
  gem?: CarvedGem;
  bonusCrackStones: number;
  message: string;
}

/**
 * Maps elemental affinity to celestial gem type.
 */
export function elementToGemType(element: ElementType): GemType {
  switch (element) {
    case 'fire':
      return 'fire_ruby';
    case 'water':
      return 'water_sapphire';
    case 'lightning':
      return 'lightning_topaz';
    case 'dark':
    default:
      return 'dark_amethyst';
  }
}

/**
 * Evaluates whether a celestial gem drops upon clearing a specific rift depth.
 */
export function evaluateRiftGemDrop(
  depth: number,
  guardianElement: ElementType,
  roll: number = Math.random(),
): RiftGemDropResult {
  if (depth < 10) {
    return {
      dropped: false,
      bonusCrackStones: 0,
      message: '심도 10층 미만에서는 천상 보옥이 출현하지 않습니다.',
    };
  }

  const gemType = elementToGemType(guardianElement);

  // Depth 50+: 100% Guaranteed Mythic Drop
  if (depth >= 50) {
    const gem: CarvedGem = { type: gemType, tier: 'mythic' };
    return {
      dropped: true,
      gem,
      bonusCrackStones: 10,
      message: `🌟 [초월 보옥 발견] 심도 ${depth}층에서 완전무결한 [신화 ${GEM_DEFINITIONS[gemType].nameKR}]을 획득했습니다!`,
    };
  }

  // Depth 30 ~ 49: 45% chance for Legendary
  if (depth >= 30) {
    if (roll <= 0.45) {
      const gem: CarvedGem = { type: gemType, tier: 'legendary' };
      return {
        dropped: true,
        gem,
        bonusCrackStones: 5,
        message: `✨ [상급 보옥 발견] 심도 ${depth}층에서 [상급 ${GEM_DEFINITIONS[gemType].nameKR}]을 획득했습니다!`,
      };
    }
  }

  // Depth 20 ~ 29: 30% chance for Rare
  else if (depth >= 20) {
    if (roll <= 0.30) {
      const gem: CarvedGem = { type: gemType, tier: 'rare' };
      return {
        dropped: true,
        gem,
        bonusCrackStones: 3,
        message: `💎 [중급 보옥 발견] 심도 ${depth}층에서 [중급 ${GEM_DEFINITIONS[gemType].nameKR}]을 획득했습니다!`,
      };
    }
  }

  // Depth 10 ~ 19: 20% chance for Normal
  else if (depth >= 10) {
    if (roll <= 0.20) {
      const gem: CarvedGem = { type: gemType, tier: 'normal' };
      return {
        dropped: true,
        gem,
        bonusCrackStones: 1,
        message: `💎 [하급 보옥 발견] 심도 ${depth}층에서 [하급 ${GEM_DEFINITIONS[gemType].nameKR}]을 획득했습니다!`,
      };
    }
  }

  return {
    dropped: false,
    bonusCrackStones: 0,
    message: `심도 ${depth}층에서 보옥 원석을 발견하지 못했습니다.`,
  };
}

/**
 * Merges newly dropped gem into owned gems list, preserving the highest tier for each type.
 */
export function mergeDroppedGemIntoInventory(
  currentOwned: CarvedGem[],
  newGem: CarvedGem,
): { updatedList: CarvedGem[]; upgraded: boolean } {
  const tierRanks: Record<GemTier, number> = {
    normal: 1,
    rare: 2,
    legendary: 3,
    mythic: 4,
  };

  const existing = currentOwned.find(g => g.type === newGem.type);
  if (!existing) {
    return {
      updatedList: [...currentOwned, newGem],
      upgraded: true,
    };
  }

  if (tierRanks[newGem.tier] > tierRanks[existing.tier]) {
    return {
      updatedList: currentOwned.map(g => (g.type === newGem.type ? newGem : g)),
      upgraded: true,
    };
  }

  return {
    updatedList: currentOwned,
    upgraded: false,
  };
}
