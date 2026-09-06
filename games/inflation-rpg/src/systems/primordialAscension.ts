/**
 * primordialAscension.ts — C1127: Primordial Ascension Grand Mastery Engine.
 *
 * Provides the pinnacle endgame progression matrix unlocked through Dimensional Essence
 * and Starlight Shards, channeling the power of the 4 Primordial Constellations:
 * - primordial_genesis: HP%, Final Dmg%, Max Level Cap
 * - primordial_annihilation: DEF Pierce%, Elemental Affinity%
 * - primordial_eternity: Damage Reduction%, Healing Efficacy%
 * - primordial_singularity: DEF-to-ATK conversion%, Battle-start Absolute Barrier turns
 */

export type PrimordialNodeId =
  | 'primordial_genesis'
  | 'primordial_annihilation'
  | 'primordial_eternity'
  | 'primordial_singularity';

export interface PrimordialNodeDef {
  id: PrimordialNodeId;
  nameKR: string;
  hanja: string;
  icon: string;
  description: string;
  maxRank: number;
  requiresSector5: boolean;
  cost: (targetRank: number) => {
    essence: number;
    shards: number;
  };
  bonusPerRank: {
    hpPercent?: number;
    finalDmgPercent?: number;
    maxLevelBonus?: number;
    defPiercePercent?: number;
    elementalAffinityPercent?: number;
    damageReductionPercent?: number;
    healingEfficacyPercent?: number;
    defToAtkPercent?: number;
    barrierTurns?: number;
  };
}

export const PRIMORDIAL_NODES: Record<PrimordialNodeId, PrimordialNodeDef> = {
  primordial_genesis: {
    id: 'primordial_genesis',
    nameKR: '태초의 창생',
    hanja: '太初創生',
    icon: '🌱',
    description: '우주 만물의 기원이 되는 생명력을 증폭하여 생명력, 최종 피해량, 한계 레벨을 확장합니다.',
    maxRank: 5,
    requiresSector5: false,
    cost: (rank: number) => ({
      essence: 1,
      shards: 250 * rank,
    }),
    bonusPerRank: {
      hpPercent: 10,
      finalDmgPercent: 5,
      maxLevelBonus: 100,
    },
  },
  primordial_annihilation: {
    id: 'primordial_annihilation',
    nameKR: '태초의 멸각',
    hanja: '太初滅却',
    icon: '⚡',
    description: '차원을 찢어발기는 태고의 파괴력을 부여하여 방어 관통력과 속성 친화력을 극대화합니다.',
    maxRank: 5,
    requiresSector5: false,
    cost: (rank: number) => ({
      essence: 1,
      shards: 250 * rank,
    }),
    bonusPerRank: {
      defPiercePercent: 12,
      elementalAffinityPercent: 8,
    },
  },
  primordial_eternity: {
    id: 'primordial_eternity',
    nameKR: '태초의 영겁',
    hanja: '太初永劫',
    icon: '🛡️',
    description: '시간의 흐름에도 마모되지 않는 영겁의 방벽을 구축하여 피해 감소율과 회복 효율을 높입니다.',
    maxRank: 5,
    requiresSector5: false,
    cost: (rank: number) => ({
      essence: 1,
      shards: 250 * rank,
    }),
    bonusPerRank: {
      damageReductionPercent: 3,
      healingEfficacyPercent: 10,
    },
  },
  primordial_singularity: {
    id: 'primordial_singularity',
    nameKR: '태초의 특이점',
    hanja: '太初特異點',
    icon: '🌌',
    description: '종언의 특이점을 완파한 자만이 개방할 수 있는 궁극의 정점. 방어력을 공격력으로 전이시키고 전투 시작 시 절대 성막을 전개합니다.',
    maxRank: 3,
    requiresSector5: true,
    cost: (rank: number) => ({
      essence: 2,
      shards: 500 * rank,
    }),
    bonusPerRank: {
      defToAtkPercent: 10,
      barrierTurns: 1,
    },
  },
};

export interface PrimordialBonuses {
  hpMultiplier: number;
  finalDmgMultiplier: number;
  maxLevelBonus: number;
  defPierceBonus: number;
  elementalAffinityBonus: number;
  damageReductionBonus: number;
  healingEfficacyBonus: number;
  defToAtkRatio: number;
  barrierTurns: number;
}

export function getPrimordialNodeDef(id: PrimordialNodeId): PrimordialNodeDef {
  return PRIMORDIAL_NODES[id];
}

/**
 * Checks whether a primordial node can be upgraded.
 */
export function checkPrimordialUpgrade(
  id: PrimordialNodeId,
  currentRanks: Partial<Record<PrimordialNodeId, number>>,
  essence: number,
  shards: number,
  clearedSectors: number[]
): { canUpgrade: boolean; reason?: string } {
  const def = PRIMORDIAL_NODES[id];
  if (!def) return { canUpgrade: false, reason: '존재하지 않는 노드입니다.' };

  const currentRank = currentRanks[id] ?? 0;
  if (currentRank >= def.maxRank) {
    return { canUpgrade: false, reason: '최대 랭크에 도달하였습니다.' };
  }

  if (def.requiresSector5 && !clearedSectors.includes(5)) {
    return { canUpgrade: false, reason: '심연 회랑 제5섹터(종언의 특이점) 완파가 필요합니다.' };
  }

  const nextRank = currentRank + 1;
  const cost = def.cost(nextRank);

  if (essence < cost.essence) {
    return {
      canUpgrade: false,
      reason: `차원 정수가 부족합니다. (필요: ${cost.essence}개 / 보유: ${essence}개)`,
    };
  }

  if (shards < cost.shards) {
    return {
      canUpgrade: false,
      reason: `별빛 파편이 부족합니다. (필요: ${cost.shards}개 / 보유: ${shards}개)`,
    };
  }

  return { canUpgrade: true };
}

/**
 * Executes a primordial node upgrade, returning updated ranks and costs.
 */
export function executePrimordialUpgrade(
  id: PrimordialNodeId,
  currentRanks: Partial<Record<PrimordialNodeId, number>>,
  essence: number,
  shards: number,
  clearedSectors: number[]
): {
  success: boolean;
  newRanks: Partial<Record<PrimordialNodeId, number>>;
  remainingEssence: number;
  remainingShards: number;
  error?: string;
} {
  const check = checkPrimordialUpgrade(id, currentRanks, essence, shards, clearedSectors);
  if (!check.canUpgrade) {
    return {
      success: false,
      newRanks: currentRanks,
      remainingEssence: essence,
      remainingShards: shards,
      error: check.reason,
    };
  }

  const def = PRIMORDIAL_NODES[id];
  const nextRank = (currentRanks[id] ?? 0) + 1;
  const cost = def.cost(nextRank);

  return {
    success: true,
    newRanks: {
      ...currentRanks,
      [id]: nextRank,
    },
    remainingEssence: essence - cost.essence,
    remainingShards: shards - cost.shards,
  };
}

/**
 * Computes the aggregated bonuses from all awakened primordial ranks.
 */
export function computeCumulativePrimordialBonuses(
  ranks: Partial<Record<PrimordialNodeId, number>>
): PrimordialBonuses {
  let hpBonusPct = 0;
  let finalDmgBonusPct = 0;
  let maxLevelBonus = 0;
  let defPierceBonusPct = 0;
  let elementalAffinityBonusPct = 0;
  let drBonusPct = 0;
  let healingEfficacyBonusPct = 0;
  let defToAtkRatioPct = 0;
  let barrierTurns = 0;

  for (const [key, rank] of Object.entries(ranks)) {
    if (!rank || rank <= 0) continue;
    const def = PRIMORDIAL_NODES[key as PrimordialNodeId];
    if (!def) continue;

    const b = def.bonusPerRank;
    if (b.hpPercent) hpBonusPct += b.hpPercent * rank;
    if (b.finalDmgPercent) finalDmgBonusPct += b.finalDmgPercent * rank;
    if (b.maxLevelBonus) maxLevelBonus += b.maxLevelBonus * rank;
    if (b.defPiercePercent) defPierceBonusPct += b.defPiercePercent * rank;
    if (b.elementalAffinityPercent) elementalAffinityBonusPct += b.elementalAffinityPercent * rank;
    if (b.damageReductionPercent) drBonusPct += b.damageReductionPercent * rank;
    if (b.healingEfficacyPercent) healingEfficacyBonusPct += b.healingEfficacyPercent * rank;
    if (b.defToAtkPercent) defToAtkRatioPct += b.defToAtkPercent * rank;
    if (b.barrierTurns) barrierTurns += b.barrierTurns * rank;
  }

  return {
    hpMultiplier: 1.0 + hpBonusPct / 100,
    finalDmgMultiplier: 1.0 + finalDmgBonusPct / 100,
    maxLevelBonus,
    defPierceBonus: defPierceBonusPct / 100,
    elementalAffinityBonus: elementalAffinityBonusPct / 100,
    damageReductionBonus: Math.min(0.25, drBonusPct / 100),
    healingEfficacyBonus: healingEfficacyBonusPct / 100,
    defToAtkRatio: defToAtkRatioPct / 100,
    barrierTurns,
  };
}

/**
 * Returns total sum of primordial ranks awakened across all 4 nodes.
 */
export function getPrimordialTotalRanks(ranks: Partial<Record<PrimordialNodeId, number>>): number {
  return Object.values(ranks).reduce((acc, r) => acc + (r ?? 0), 0);
}
