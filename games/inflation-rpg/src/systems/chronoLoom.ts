/**
 * chronoLoom.ts — C1147: Chrono Loom Tech Matrix & Progression Engine.
 *
 * Provides the permanent prestige spending tree for Chrono Essence earned via Chrono Rebirth:
 * - warp_accelerant: Action speed & agility acceleration (+5% per rank, up to +25%).
 * - singularity_aegis: Universal damage dampening (+4% per rank, up to +20%) & fatal damage guard at Rank 5.
 * - chrono_duplication: Boss drop duplication probability (+6% per rank, up to +30%).
 * - temporal_sovereign: Universal omni-stat base multiplier (+10% per rank, up to +50%).
 */

import type { ChronoLoomNodeId, MetaState } from '../types';

export type { ChronoLoomNodeId } from '../types';

export const MAX_CHRONO_LOOM_RANK = 5;

export interface ChronoLoomNodeDef {
  id: ChronoLoomNodeId;
  nameKR: string;
  hanja: string;
  icon: string;
  maxRank: number;
  description: string;
  costFormula: (nextRank: number) => number;
}

export const CHRONO_LOOM_NODES: Record<ChronoLoomNodeId, ChronoLoomNodeDef> = {
  warp_accelerant: {
    id: 'warp_accelerant',
    nameKR: '시공 가속',
    hanja: '時空加速',
    icon: '⚡',
    maxRank: MAX_CHRONO_LOOM_RANK,
    description: '시공간의 흐름을 가속하여 턴 행동 속도 및 쿨다운을 랭크당 5%씩 단축합니다.',
    costFormula: (nextRank: number) => nextRank, // 1, 2, 3, 4, 5
  },
  singularity_aegis: {
    id: 'singularity_aegis',
    nameKR: '특이점 결계',
    hanja: '特異點結界',
    icon: '🛡️',
    maxRank: MAX_CHRONO_LOOM_RANK,
    description: '시공의 왜곡을 방벽 삼아 모든 받는 피해를 랭크당 4%씩 경감하며, 5랭크 시 1회 치명타 즉사 결계를 형성합니다.',
    costFormula: (nextRank: number) => nextRank,
  },
  chrono_duplication: {
    id: 'chrono_duplication',
    nameKR: '인과 복제',
    hanja: '因果複製',
    icon: '💎',
    maxRank: MAX_CHRONO_LOOM_RANK,
    description: '평행세계의 결실을 복제하여 보스 격파 시 장비/전리품 드랍이 2배로 복제될 확률을 랭크당 6%씩 증폭합니다.',
    costFormula: (nextRank: number) => nextRank,
  },
  temporal_sovereign: {
    id: 'temporal_sovereign',
    nameKR: '시간 주재',
    hanja: '時間主宰',
    icon: '👑',
    maxRank: MAX_CHRONO_LOOM_RANK,
    description: '시간의 군주로서의 권능을 발현하여 영웅의 모든 기초 능력치(HP/공격력/방어력)를 랭크당 10%씩 영구 증폭합니다.',
    costFormula: (nextRank: number) => nextRank,
  },
};

export const ALL_CHRONO_LOOM_NODE_IDS: ChronoLoomNodeId[] = [
  'warp_accelerant',
  'singularity_aegis',
  'chrono_duplication',
  'temporal_sovereign',
];

export interface ChronoLoomPerks {
  actionSpeedBonus: number;
  damageReduction: number;
  fatalGuard: boolean;
  duplicationChance: number;
  omniStatMultiplierBonus: number;
  totalLoomRanks: number;
}

/**
 * Retrieves the definition for a specific Chrono Loom node.
 */
export function getChronoLoomNode(id: ChronoLoomNodeId): ChronoLoomNodeDef {
  return CHRONO_LOOM_NODES[id];
}

/**
 * Calculates the Chrono Essence cost required to upgrade a node to its next rank.
 */
export function getNodeUpgradeCost(nodeId: ChronoLoomNodeId, currentRank: number): number {
  const node = getChronoLoomNode(nodeId);
  if (currentRank >= node.maxRank) return Infinity;
  return node.costFormula(currentRank + 1);
}

export interface LoomUpgradeCheck {
  canUpgrade: boolean;
  reason?: string;
  cost: number;
  currentRank: number;
  nextRank: number;
}

/**
 * Checks if a player can upgrade a specific Chrono Loom node.
 */
export function canUpgradeChronoLoomNode(
  meta: MetaState,
  nodeId: ChronoLoomNodeId
): LoomUpgradeCheck {
  const node = getChronoLoomNode(nodeId);
  const currentRank = meta.chronoLoomRanks?.[nodeId] ?? 0;

  if (currentRank >= node.maxRank) {
    return {
      canUpgrade: false,
      reason: '이미 최고 랭크에 도달하였습니다.',
      cost: Infinity,
      currentRank,
      nextRank: currentRank,
    };
  }

  const cost = getNodeUpgradeCost(nodeId, currentRank);
  const essenceAvailable = (meta as unknown as { chronoEssence?: number }).chronoEssence ?? 0;

  if (essenceAvailable < cost) {
    return {
      canUpgrade: false,
      reason: `시공 정수가 부족합니다 (필요: ${cost}개, 보유: ${essenceAvailable}개)`,
      cost,
      currentRank,
      nextRank: currentRank + 1,
    };
  }

  return {
    canUpgrade: true,
    cost,
    currentRank,
    nextRank: currentRank + 1,
  };
}

/**
 * Executes a Chrono Loom node upgrade, deducting Chrono Essence and returning updated MetaState.
 */
export function upgradeChronoLoomNode(
  meta: MetaState,
  nodeId: ChronoLoomNodeId
): {
  newMeta: MetaState;
  upgradedRank: number;
  costPaid: number;
} {
  const check = canUpgradeChronoLoomNode(meta, nodeId);
  if (!check.canUpgrade) {
    throw new Error(check.reason ?? '베틀 노드를 강화할 수 없습니다.');
  }

  const currentEssence = (meta as unknown as { chronoEssence?: number }).chronoEssence ?? 0;
  const currentRanks = meta.chronoLoomRanks ?? {};

  const nextEssence = currentEssence - check.cost;
  const nextRank = check.nextRank;

  const newMeta: MetaState = {
    ...meta,
    chronoEssence: nextEssence,
    chronoLoomRanks: {
      ...currentRanks,
      [nodeId]: nextRank,
    },
  } as any;

  return {
    newMeta,
    upgradedRank: nextRank,
    costPaid: check.cost,
  };
}

/**
 * Evaluates active perks and cumulative multipliers granted by all Chrono Loom ranks.
 */
export function evaluateChronoLoomPerks(meta: MetaState): ChronoLoomPerks {
  const ranks = meta.chronoLoomRanks ?? {};

  const rWarp = ranks.warp_accelerant ?? 0;
  const rAegis = ranks.singularity_aegis ?? 0;
  const rDup = ranks.chrono_duplication ?? 0;
  const rSovereign = ranks.temporal_sovereign ?? 0;

  const totalRanks = rWarp + rAegis + rDup + rSovereign;

  return {
    actionSpeedBonus: Number((rWarp * 0.05).toFixed(2)),
    damageReduction: Number((rAegis * 0.04).toFixed(2)),
    fatalGuard: rAegis >= 5,
    duplicationChance: Number((rDup * 0.06).toFixed(2)),
    omniStatMultiplierBonus: Number((rSovereign * 0.10).toFixed(2)),
    totalLoomRanks: totalRanks,
  };
}
