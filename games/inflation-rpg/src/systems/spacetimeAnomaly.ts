/**
 * spacetimeAnomaly.ts — C1111: Spacetime Anomaly Encounter Engine.
 *
 * Implements cosmic spacetime distortion phenomena across overworld & deep rift:
 * - 4 Dimensional Anomalies:
 *   1. chrono_surge (시간 왜곡: 2x speed, +20% dmg taken)
 *   2. gravity_well (중력 붕괴: -50% def, +50% elemental dmg)
 *   3. quantum_phase (양자 위상: 25% true pierce, 10% phase miss)
 *   4. singularity_core (특이점 핵: 3x celestial loot, +50% enemy atk)
 * - 3 Tactical Approaches:
 *   1. stabilize (안정화: 5 파편 소모로 페널티 무효화 및 안전 버프)
 *   2. harness (수용: 이상 현상 원형 그대로 전투 돌입)
 *   3. collapse (강제 붕괴: 극한 난이도 돌입, 차원 정수 100% 드롭)
 */

export type SpacetimeAnomalyType =
  | 'chrono_surge'
  | 'gravity_well'
  | 'quantum_phase'
  | 'singularity_core';

export type AnomalyTactic = 'stabilize' | 'harness' | 'collapse';

export interface SpacetimeAnomalyDef {
  type: SpacetimeAnomalyType;
  nameKR: string;
  hanja: string;
  emoji: string;
  description: string;
  positiveModifierDesc: string;
  negativeModifierDesc: string;
}

export const ANOMALIES: Record<SpacetimeAnomalyType, SpacetimeAnomalyDef> = {
  chrono_surge: {
    type: 'chrono_surge',
    nameKR: '시간 왜곡 (Chrono Surge)',
    hanja: '時間歪曲',
    emoji: '⏳⚡',
    description: '시공간의 흐름이 급격히 가속되어 행동 템포가 뒤틀립니다.',
    positiveModifierDesc: '영웅 공격력 +20% 및 가속 배율 적용',
    negativeModifierDesc: '피격 시 받는 피해 20% 증가',
  },
  gravity_well: {
    type: 'gravity_well',
    nameKR: '중력 붕괴 (Gravity Well)',
    hanja: '重力崩壞',
    emoji: '🌌🪐',
    description: '초중력장이 발생하여 물리적 방어막을 으스러뜨립니다.',
    positiveModifierDesc: '모든 속성 원소 피해 50% 폭증',
    negativeModifierDesc: '영웅 및 적 물리 방어력 50% 삭감',
  },
  quantum_phase: {
    type: 'quantum_phase',
    nameKR: '양자 위상 (Quantum Phase)',
    hanja: '量子位相',
    emoji: '⚛️✨',
    description: '물질의 존재 확률이 진동하여 시공간을 투과합니다.',
    positiveModifierDesc: '25% 확률로 적의 모든 방어를 완전 무시하고 관통',
    negativeModifierDesc: '10% 확률로 공격이 위상 간섭에 의해 무효화',
  },
  singularity_core: {
    type: 'singularity_core',
    nameKR: '특이점 핵 (Singularity Core)',
    hanja: '特異點核',
    emoji: '🌀💥',
    description: '블랙홀의 중심 핵이 차원의 장벽을 찢고 물질을 집어삼킵니다.',
    positiveModifierDesc: '전투 승리 시 모든 보상 3배 지급',
    negativeModifierDesc: '적 공격력 50% 폭증',
  },
};

export interface AnomalyCombatModifiers {
  heroAtkMultiplier: number;
  heroDefMultiplier: number;
  enemyAtkMultiplier: number;
  enemyDefMultiplier: number;
  damageTakenMultiplier: number;
  elementalBonusMultiplier: number;
  pierceChance: number;
  missChance: number;
  rewardsMultiplier: number;
  guaranteedEssenceDrop: boolean;
  shardsCost: number;
}

/**
 * Calculates combat modifiers based on anomaly type and chosen player tactic.
 */
export function resolveAnomalyModifiers(
  anomalyType: SpacetimeAnomalyType,
  tactic: AnomalyTactic
): AnomalyCombatModifiers {
  // Base default modifiers
  let heroAtk = 1.0;
  let heroDef = 1.0;
  let enemyAtk = 1.0;
  let enemyDef = 1.0;
  let dmgTaken = 1.0;
  let elementalBonus = 1.0;
  let pierceChance = 0;
  let missChance = 0;
  let rewardsMultiplier = 1.0;
  let guaranteedEssenceDrop = false;
  let shardsCost = 0;

  if (tactic === 'stabilize') {
    // 5 Shards cost: neutralizes all drawbacks, provides safe +15% buffs
    shardsCost = 5;
    heroAtk = 1.15;
    heroDef = 1.15;
    rewardsMultiplier = 1.2;
    return {
      heroAtkMultiplier: heroAtk,
      heroDefMultiplier: heroDef,
      enemyAtkMultiplier: enemyAtk,
      enemyDefMultiplier: enemyDef,
      damageTakenMultiplier: dmgTaken,
      elementalBonusMultiplier: elementalBonus,
      pierceChance,
      missChance,
      rewardsMultiplier,
      guaranteedEssenceDrop,
      shardsCost,
    };
  }

  // Apply Anomaly specific values for 'harness'
  switch (anomalyType) {
    case 'chrono_surge':
      heroAtk = 1.20;
      dmgTaken = 1.20;
      break;
    case 'gravity_well':
      elementalBonus = 1.50;
      heroDef = 0.50;
      enemyDef = 0.50;
      break;
    case 'quantum_phase':
      pierceChance = 0.25;
      missChance = 0.10;
      break;
    case 'singularity_core':
      enemyAtk = 1.50;
      rewardsMultiplier = 3.0;
      break;
  }

  if (tactic === 'collapse') {
    // Collapse increases stakes: enemy gets +30% ATK, rewards increased, guaranteed essence drop
    enemyAtk = Math.round(enemyAtk * 1.30 * 100) / 100;
    heroAtk = Math.round(heroAtk * 1.25 * 100) / 100;
    rewardsMultiplier = Math.round(rewardsMultiplier * 1.5 * 100) / 100;
    guaranteedEssenceDrop = true;
  }

  return {
    heroAtkMultiplier: heroAtk,
    heroDefMultiplier: heroDef,
    enemyAtkMultiplier: enemyAtk,
    enemyDefMultiplier: enemyDef,
    damageTakenMultiplier: dmgTaken,
    elementalBonusMultiplier: elementalBonus,
    pierceChance,
    missChance,
    rewardsMultiplier,
    guaranteedEssenceDrop,
    shardsCost,
  };
}

/**
 * Procedurally rolls a spacetime anomaly based on an RNG seed or pseudo-randomness.
 */
export function rollSpacetimeAnomaly(seed: number): SpacetimeAnomalyDef {
  const types: SpacetimeAnomalyType[] = [
    'chrono_surge',
    'gravity_well',
    'quantum_phase',
    'singularity_core',
  ];
  const idx = Math.abs(seed) % types.length;
  return ANOMALIES[types[idx]];
}
