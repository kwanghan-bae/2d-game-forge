/**
 * mythicGearAwakening.ts — C1093: Five-Star Nebula Mythic Gear Awakening & Set Resonance Engine.
 *
 * Implements equipment star awakening (1 ~ 5 Stars) and set resonance synergies:
 * - Each star increases item base stats (+20% per star, up to +100% at 5-Star).
 * - Aggregate star resonance triggers milestones:
 *   - 2 Stars: Elemental Pierce +15%
 *   - 5 Stars: Crit DMG +35% & DR +5%
 *   - 10 Stars: Elemental Pierce +30% & ATK/HP +25%
 *   - 15 Stars: Chaos Erosion Immunity & Final DMG Multiplier 1.30x
 */

export interface MythicStarCost {
  star: number;
  costShards: number;
  costCrackStones: number;
  costGold: number;
  statBonusPercent: number;
}

export const MAX_MYTHIC_STARS = 5;

export const MYTHIC_STAR_PROGRESSION: readonly MythicStarCost[] = [
  { star: 1, costShards: 40, costCrackStones: 5, costGold: 100000, statBonusPercent: 20 },
  { star: 2, costShards: 70, costCrackStones: 10, costGold: 200000, statBonusPercent: 40 },
  { star: 3, costShards: 110, costCrackStones: 18, costGold: 350000, statBonusPercent: 60 },
  { star: 4, costShards: 160, costCrackStones: 28, costGold: 550000, statBonusPercent: 80 },
  { star: 5, costShards: 230, costCrackStones: 40, costGold: 800000, statBonusPercent: 100 },
];

export interface MythicSetResonance {
  totalStars: number;
  elementalPiercePercent: number;
  critDmgBonus: number;
  damageReduction: number;
  atkBonusPercent: number;
  hpBonusPercent: number;
  chaosErosionImmunity: boolean;
  finalDmgMultiplier: number;
  activeMilestones: string[];
}

/**
 * Returns stat multiplier for given star level (0 ~ 5).
 */
export function computeMythicStarMultiplier(stars: number): number {
  const safeStars = Math.min(MAX_MYTHIC_STARS, Math.max(0, stars));
  return 1 + safeStars * 0.20; // 0: 1.0x, 5: 2.0x
}

/**
 * Checks if player can awaken item to next star level.
 */
export function canAwakenMythicStar(
  currentStars: number,
  shards: number,
  crackStones: number,
  gold: number,
): boolean {
  if (currentStars >= MAX_MYTHIC_STARS) return false;
  const cost = MYTHIC_STAR_PROGRESSION[currentStars]; // 0 -> star 1
  if (!cost) return false;
  return (
    shards >= cost.costShards &&
    crackStones >= cost.costCrackStones &&
    gold >= cost.costGold
  );
}

/**
 * Upgrades item star awakening to next level.
 */
export function awakenMythicStar(
  currentStars: number,
  shards: number,
  crackStones: number,
  gold: number,
): {
  success: boolean;
  newStars: number;
  shardsSpent: number;
  crackStonesSpent: number;
  goldSpent: number;
  message: string;
} {
  if (currentStars >= MAX_MYTHIC_STARS) {
    return {
      success: false,
      newStars: currentStars,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '이미 최고 성운 5성 각성을 완료했습니다.',
    };
  }

  const cost = MYTHIC_STAR_PROGRESSION[currentStars];
  if (!cost) {
    return {
      success: false,
      newStars: currentStars,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '유효하지 않은 각성 단계입니다.',
    };
  }

  if (shards < cost.costShards || crackStones < cost.costCrackStones || gold < cost.costGold) {
    return {
      success: false,
      newStars: currentStars,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '성운 각성에 필요한 재화가 부족합니다.',
    };
  }

  const newStars = currentStars + 1;
  return {
    success: true,
    newStars,
    shardsSpent: cost.costShards,
    crackStonesSpent: cost.costCrackStones,
    goldSpent: cost.costGold,
    message: `축하합니다! 신화 장비가 [${newStars}성 성운]으로 각성하여 기본 능력치가 +${cost.statBonusPercent}% 증폭되었습니다!`,
  };
}

/**
 * Computes aggregate set resonance bonuses from total equipped star awakenings.
 */
export function computeMythicSetResonance(totalStars: number): MythicSetResonance {
  const res: MythicSetResonance = {
    totalStars,
    elementalPiercePercent: 0,
    critDmgBonus: 0,
    damageReduction: 0,
    atkBonusPercent: 0,
    hpBonusPercent: 0,
    chaosErosionImmunity: false,
    finalDmgMultiplier: 1.0,
    activeMilestones: [],
  };

  if (totalStars >= 2) {
    res.elementalPiercePercent += 15;
    res.activeMilestones.push('⭐ 2성 공명: 원소 관통 +15%');
  }

  if (totalStars >= 5) {
    res.critDmgBonus += 0.35;
    res.damageReduction += 0.05;
    res.activeMilestones.push('⭐⭐ 5성 공명: 치명타 피해 +35% & 피해 감소 +5%');
  }

  if (totalStars >= 10) {
    res.elementalPiercePercent += 15; // Total 30%
    res.atkBonusPercent += 25;
    res.hpBonusPercent += 25;
    res.activeMilestones.push('⭐⭐⭐ 10성 공명: 원소 관통 +30% & 공격력/체력 +25%');
  }

  if (totalStars >= 15) {
    res.chaosErosionImmunity = true;
    res.finalDmgMultiplier = 1.30;
    res.activeMilestones.push('👑 15성 초월: 혼돈 침식 무효화 & 최종 피해 +30%');
  }

  return res;
}
