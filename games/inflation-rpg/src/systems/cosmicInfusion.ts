/**
 * cosmicInfusion.ts — C1115: Celestial Infusion Equipment Enhancement Engine.
 *
 * Enables heroes to infuse dimensional essences harvested from collapsed spacetime anomalies
 * into mythic equipment to grant powerful cosmic affixes:
 * - celestial_sharpness: +15% Crit DMG, +5% DEF Pierce
 * - astral_fortitude: +10% HP, +5% Damage Reduction
 * - singularity_might: +12% ATK, +5% Final Damage Multiplier
 * - cosmic_celerity: +15% SPD, +5% Dodge Rate
 */

import type { EquipmentInstance } from '../types';

export type CosmicAffixType =
  | 'celestial_sharpness'
  | 'astral_fortitude'
  | 'singularity_might'
  | 'cosmic_celerity';

export interface CosmicAffixDef {
  type: CosmicAffixType;
  nameKR: string;
  hanja: string;
  emoji: string;
  description: string;
  stats: {
    critDmgBonus?: number;
    defPierceBonus?: number;
    hpPercentBonus?: number;
    damageReduction?: number;
    atkPercentBonus?: number;
    finalDmgMultiplierBonus?: number;
    spdPercentBonus?: number;
    dodgeRateBonus?: number;
  };
}

export const COSMIC_AFFIXES: Record<CosmicAffixType, CosmicAffixDef> = {
  celestial_sharpness: {
    type: 'celestial_sharpness',
    nameKR: '천상의 예리함',
    hanja: '天上銳利',
    emoji: '⚔️✨',
    description: '우주적 절단력이 깃들어 치명타 피해 15% 및 방어 관통 5%를 부여합니다.',
    stats: { critDmgBonus: 0.15, defPierceBonus: 0.05 },
  },
  astral_fortitude: {
    type: 'astral_fortitude',
    nameKR: '성간의 불굴',
    hanja: '星間不屈',
    emoji: '🛡️🌌',
    description: '성간의 압력을 견뎌내는 불굴의 방벽으로 최대 체력 10% 및 피해 경감 5%를 부여합니다.',
    stats: { hpPercentBonus: 0.10, damageReduction: 0.05 },
  },
  singularity_might: {
    type: 'singularity_might',
    nameKR: '특이점의 위력',
    hanja: '特異點威力',
    emoji: '🌀🔥',
    description: '특이점의 파괴적 에너지가 공격력 12% 및 최종 피해 배율 5%를 증폭시킵니다.',
    stats: { atkPercentBonus: 0.12, finalDmgMultiplierBonus: 0.05 },
  },
  cosmic_celerity: {
    type: 'cosmic_celerity',
    nameKR: '우주의 신속',
    hanja: '宇宙迅速',
    emoji: '⚡💫',
    description: '시공간을 미끄러지듯 이동하여 행동 속도 15% 및 회피율 5%를 상승시킵니다.',
    stats: { spdPercentBonus: 0.15, dodgeRateBonus: 0.05 },
  },
};

export const INFUSION_COST = {
  essence: 1,
  shards: 20,
  gold: 50_000,
};

/**
 * Checks whether the player meets the cost requirements for cosmic infusion.
 */
export function canInfuseEquipment(
  essence: number,
  shards: number,
  gold: number
): boolean {
  return (
    essence >= INFUSION_COST.essence &&
    shards >= INFUSION_COST.shards &&
    gold >= INFUSION_COST.gold
  );
}

/**
 * Infuses an equipment instance with the specified cosmic affix.
 */
export function infuseEquipment(
  instance: EquipmentInstance,
  affixType: CosmicAffixType,
  essence: number,
  shards: number,
  gold: number
): {
  success: boolean;
  updatedInstance?: EquipmentInstance;
  costSpent: { essence: number; shards: number; gold: number };
  message: string;
} {
  if (!canInfuseEquipment(essence, shards, gold)) {
    return {
      success: false,
      costSpent: { essence: 0, shards: 0, gold: 0 },
      message: '천상 주입에 필요한 재화가 부족합니다.',
    };
  }

  const updated: EquipmentInstance = {
    ...instance,
    cosmicAffix: affixType,
  };

  return {
    success: true,
    updatedInstance: updated,
    costSpent: { ...INFUSION_COST },
    message: `[${COSMIC_AFFIXES[affixType].nameKR}] 주입에 성공했습니다!`,
  };
}

export interface AggregateCosmicBonuses {
  critDmgBonus: number;
  defPierceBonus: number;
  hpPercentBonus: number;
  damageReduction: number;
  atkPercentBonus: number;
  finalDmgMultiplierBonus: number;
  spdPercentBonus: number;
  dodgeRateBonus: number;
}

/**
 * Aggregates all cosmic affixes across equipped items.
 */
export function computeAggregateCosmicBonuses(
  instances: EquipmentInstance[]
): AggregateCosmicBonuses {
  const result: AggregateCosmicBonuses = {
    critDmgBonus: 0,
    defPierceBonus: 0,
    hpPercentBonus: 0,
    damageReduction: 0,
    atkPercentBonus: 0,
    finalDmgMultiplierBonus: 0,
    spdPercentBonus: 0,
    dodgeRateBonus: 0,
  };

  for (const inst of instances) {
    if (!inst.cosmicAffix) continue;
    const def = COSMIC_AFFIXES[inst.cosmicAffix];
    if (!def) continue;

    if (def.stats.critDmgBonus) result.critDmgBonus += def.stats.critDmgBonus;
    if (def.stats.defPierceBonus) result.defPierceBonus += def.stats.defPierceBonus;
    if (def.stats.hpPercentBonus) result.hpPercentBonus += def.stats.hpPercentBonus;
    if (def.stats.damageReduction) result.damageReduction += def.stats.damageReduction;
    if (def.stats.atkPercentBonus) result.atkPercentBonus += def.stats.atkPercentBonus;
    if (def.stats.finalDmgMultiplierBonus) result.finalDmgMultiplierBonus += def.stats.finalDmgMultiplierBonus;
    if (def.stats.spdPercentBonus) result.spdPercentBonus += def.stats.spdPercentBonus;
    if (def.stats.dodgeRateBonus) result.dodgeRateBonus += def.stats.dodgeRateBonus;
  }

  return {
    critDmgBonus: Math.round(result.critDmgBonus * 100) / 100,
    defPierceBonus: Math.round(result.defPierceBonus * 100) / 100,
    hpPercentBonus: Math.round(result.hpPercentBonus * 100) / 100,
    damageReduction: Math.round(result.damageReduction * 100) / 100,
    atkPercentBonus: Math.round(result.atkPercentBonus * 100) / 100,
    finalDmgMultiplierBonus: Math.round(result.finalDmgMultiplierBonus * 100) / 100,
    spdPercentBonus: Math.round(result.spdPercentBonus * 100) / 100,
    dodgeRateBonus: Math.round(result.dodgeRateBonus * 100) / 100,
  };
}
