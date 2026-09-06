/**
 * astralAlchemy.ts — C1063: Celestial Astral Alchemy & Starlight Shards Engine.
 *
 * Implements Taoist alchemy (단학/연단술) allowing heroes to refine Starlight Shards
 * and craft 4 legendary celestial elixirs to permanently expand their core stat boundaries.
 */

export type ElixirType = 'solar_pill' | 'lunar_elixir' | 'lightning_crystal' | 'abyssal_essence';

export const MAX_ELIXIR_DOSES = 10;

export interface ElixirDef {
  id: ElixirType;
  nameKR: string;
  emoji: string;
  hanja: string;
  costShards: number;
  costGold: number;
  maxDoses: number;
  description: string;
  bonusesPerDose: {
    atkPercent?: number;
    hpPercent?: number;
    defPercent?: number;
    spdFlat?: number;
    critRate?: number;
    elementalDmgPercent?: number;
    damageReduction?: number;
  };
}

export const ELIXIR_DEFINITIONS: Record<ElixirType, ElixirDef> = {
  solar_pill: {
    id: 'solar_pill',
    nameKR: '태양의 환약 (태양단)',
    emoji: '☀️💊',
    hanja: '太陽丹',
    costShards: 50,
    costGold: 10000,
    maxDoses: MAX_ELIXIR_DOSES,
    description: '작열하는 태양의 양기를 응축한 환약. 복용 시마다 영구 공격력 +2%를 부여합니다.',
    bonusesPerDose: {
      atkPercent: 2,
    },
  },
  lunar_elixir: {
    id: 'lunar_elixir',
    nameKR: '월광의 영액 (태음액)',
    emoji: '🌙🧪',
    hanja: '太陰液',
    costShards: 50,
    costGold: 10000,
    maxDoses: MAX_ELIXIR_DOSES,
    description: '서늘한 달빛의 음기를 정제한 영액. 복용 시마다 영구 최대 체력 +2% 및 방어력 +2%를 부여합니다.',
    bonusesPerDose: {
      hpPercent: 2,
      defPercent: 2,
    },
  },
  lightning_crystal: {
    id: 'lightning_crystal',
    nameKR: '뇌전의 결정 (뇌정석)',
    emoji: '⚡💎',
    hanja: '雷晶石',
    costShards: 50,
    costGold: 10000,
    maxDoses: MAX_ELIXIR_DOSES,
    description: '벼락의 정수를 결정화한 영약. 복용 시마다 영구 행동속도 +1 및 치명타 확률 +1%를 부여합니다.',
    bonusesPerDose: {
      spdFlat: 1,
      critRate: 0.01,
    },
  },
  abyssal_essence: {
    id: 'abyssal_essence',
    nameKR: '심연의 정수 (혼원정)',
    emoji: '🌑✨',
    hanja: '混元精',
    costShards: 80,
    costGold: 20000,
    maxDoses: MAX_ELIXIR_DOSES,
    description: '원초적 혼돈의 기운을 담은 궁극의 정수. 속성 공명 피해 +2% 및 받는 피해 감소 +0.5%를 부여합니다.',
    bonusesPerDose: {
      elementalDmgPercent: 2,
      damageReduction: 0.005,
    },
  },
};

export const ALL_ELIXIRS: readonly ElixirType[] = [
  'solar_pill',
  'lunar_elixir',
  'lightning_crystal',
  'abyssal_essence',
];

export interface ElixirStatBonus {
  atkPercent: number;
  hpPercent: number;
  defPercent: number;
  spdFlat: number;
  critRate: number;
  elementalDmgPercent: number;
  damageReduction: number;
  totalDoses: number;
}

export const EMPTY_ELIXIR_BONUS: ElixirStatBonus = {
  atkPercent: 0,
  hpPercent: 0,
  defPercent: 0,
  spdFlat: 0,
  critRate: 0,
  elementalDmgPercent: 0,
  damageReduction: 0,
  totalDoses: 0,
};

/**
 * Checks if hero has enough resources and remaining dose capacity to craft elixir.
 */
export function canCraftElixir(
  elixir: ElixirType,
  availableShards: number,
  availableGold: number,
  currentDoses: number = 0,
): boolean {
  if (currentDoses >= MAX_ELIXIR_DOSES) return false;
  const def = ELIXIR_DEFINITIONS[elixir];
  return availableShards >= def.costShards && availableGold >= def.costGold;
}

export interface CraftElixirResult {
  success: boolean;
  shardsSpent: number;
  goldSpent: number;
  newDoseCount: number;
  message: string;
}

/**
 * Crafts and ingests an elixir, incrementing dose count.
 */
export function craftAndConsumeElixir(
  elixir: ElixirType,
  availableShards: number,
  availableGold: number,
  currentDoses: number = 0,
): CraftElixirResult {
  if (currentDoses >= MAX_ELIXIR_DOSES) {
    return {
      success: false,
      shardsSpent: 0,
      goldSpent: 0,
      newDoseCount: currentDoses,
      message: '이미 최대 복용 한도(10회)에 도달했습니다.',
    };
  }

  const def = ELIXIR_DEFINITIONS[elixir];
  if (availableShards < def.costShards || availableGold < def.costGold) {
    return {
      success: false,
      shardsSpent: 0,
      goldSpent: 0,
      newDoseCount: currentDoses,
      message: '연성을 위한 별빛 파편 또는 골드가 부족합니다.',
    };
  }

  const nextCount = currentDoses + 1;
  return {
    success: true,
    shardsSpent: def.costShards,
    goldSpent: def.costGold,
    newDoseCount: nextCount,
    message: `✨ [${def.nameKR}] 연성 및 복용 성공! (${nextCount}/${MAX_ELIXIR_DOSES}회 복용)`,
  };
}

/**
 * Transmutes crack stones or enhance stones into starlight shards.
 * 1 CrackStone -> 10 Shards
 * 5 EnhanceStones -> 10 Shards (2 shards per stone)
 */
export function transmuteToShards(
  sourceType: 'crackStone' | 'enhanceStone',
  countToConsume: number,
): { shardsGained: number; stonesConsumed: number } {
  if (countToConsume <= 0) {
    return { shardsGained: 0, stonesConsumed: 0 };
  }

  if (sourceType === 'crackStone') {
    return {
      shardsGained: countToConsume * 10,
      stonesConsumed: countToConsume,
    };
  } else {
    // Round down to multiples of 5
    const bundles = Math.floor(countToConsume / 5);
    return {
      shardsGained: bundles * 10,
      stonesConsumed: bundles * 5,
    };
  }
}

/**
 * Computes aggregated permanent stat bonuses from all consumed elixirs.
 */
export function computeElixirStatBonuses(
  doses: Partial<Record<ElixirType, number>> = {},
): ElixirStatBonus {
  const result: ElixirStatBonus = { ...EMPTY_ELIXIR_BONUS };

  for (const elixir of ALL_ELIXIRS) {
    const count = Math.min(MAX_ELIXIR_DOSES, doses[elixir] ?? 0);
    if (count <= 0) continue;

    result.totalDoses += count;
    const b = ELIXIR_DEFINITIONS[elixir].bonusesPerDose;

    if (b.atkPercent) result.atkPercent += b.atkPercent * count;
    if (b.hpPercent) result.hpPercent += b.hpPercent * count;
    if (b.defPercent) result.defPercent += b.defPercent * count;
    if (b.spdFlat) result.spdFlat += b.spdFlat * count;
    if (b.critRate) result.critRate += b.critRate * count;
    if (b.elementalDmgPercent) result.elementalDmgPercent += b.elementalDmgPercent * count;
    if (b.damageReduction) result.damageReduction += b.damageReduction * count;
  }

  return result;
}
