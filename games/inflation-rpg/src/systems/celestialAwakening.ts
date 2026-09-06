/**
 * celestialAwakening.ts — C1075: Nine-Star Celestial Realm Transcendent Awakening Engine.
 *
 * Implements the 9-Star Celestial Realm (구속천계경지 九星天界境地) progression:
 * Tier 1: 일성경 · 개광 (開光) - Initial Enlightenment
 * Tier 2: 이성경 · 벽곡 (辟穀) - Inedia Purification
 * Tier 3: 삼성경 · 통현 (通玄) - Mystic Transcendence
 * Tier 4: 사성경 · 귀진 (歸眞) - Primordial Truth Return
 * Tier 5: 오성경 · 단성 (丹成) - Golden Core Formation
 * Tier 6: 육성경 · 영적 (靈寂) - Spiritual Stillness
 * Tier 7: 칠성경 · 원영 (元嬰) - Nascent Soul Birth
 * Tier 8: 팔성경 · 화신 (化神) - Deity Incarnation
 * Tier 9: 구성경 · 천외천 (天外天) - Zenith Beyond Heavens
 */

export interface AwakeningTierDef {
  tier: number;
  nameKR: string;
  hanja: string;
  title: string;
  emoji: string;
  color: string;
  costShards: number;
  costCrackStones: number;
  description: string;
  bonuses: {
    atkPercent?: number;
    hpPercent?: number;
    defPercent?: number;
    spdFlat?: number;
    critRate?: number;
    critDmg?: number;
    elementalDmgPercent?: number;
    damageReduction?: number;
    finalDmgMultiplier?: number;
  };
}

export const MAX_AWAKENING_TIER = 9;

export const AWAKENING_TIERS: readonly AwakeningTierDef[] = [
  {
    tier: 1,
    nameKR: '일성경 · 개광',
    hanja: '開光',
    title: '성광의 각성자',
    emoji: '⭐✨',
    color: '#38bdf8',
    costShards: 40,
    costCrackStones: 5,
    description: '영혼의 눈을 떠 우주의 성광을 체내로 받아들여 공격력과 체력이 크게 증폭됩니다.',
    bonuses: { atkPercent: 15, hpPercent: 15 },
  },
  {
    tier: 2,
    nameKR: '이성경 · 벽곡',
    hanja: '辟穀',
    title: '성기의 순화자',
    emoji: '🌟🛡️',
    color: '#34d399',
    costShards: 60,
    costCrackStones: 8,
    description: '세속의 불순물을 씻어내고 맑은 진기로 육신을 감싸 방어력과 피해 감소를 획득합니다.',
    bonuses: { defPercent: 20, damageReduction: 0.02 },
  },
  {
    tier: 3,
    nameKR: '삼성경 · 통현',
    hanja: '通玄',
    title: '현묘의 탐구자',
    emoji: '🌀🎯',
    color: '#a855f7',
    costShards: 90,
    costCrackStones: 12,
    description: '삼라만상의 이치를 통찰하여 속성 상성 피해와 치명타 확률을 비약적으로 끌어올립니다.',
    bonuses: { elementalDmgPercent: 25, critRate: 0.06 },
  },
  {
    tier: 4,
    nameKR: '사성경 · 귀진',
    hanja: '歸眞',
    title: '근원의 회귀자',
    emoji: '⚡🗡️',
    color: '#f59e0b',
    costShards: 130,
    costCrackStones: 16,
    description: '번뇌를 벗어나 근원적인 순수한 파괴력으로 회귀하여 일격의 위력을 극대화합니다.',
    bonuses: { atkPercent: 25, critDmg: 0.30 },
  },
  {
    tier: 5,
    nameKR: '오성경 · 단성',
    hanja: '丹成',
    title: '금단의 성취자',
    emoji: '🌕✨',
    color: '#eab308',
    costShards: 180,
    costCrackStones: 22,
    description: '단전에 불멸의 황금 성핵(金丹)이 맺혀 영구적인 생명력과 방어 결계를 확립합니다.',
    bonuses: { hpPercent: 30, defPercent: 25, damageReduction: 0.03 },
  },
  {
    tier: 6,
    nameKR: '육성경 · 영적',
    hanja: '靈寂',
    title: '적멸의 신속자',
    emoji: '🌌💨',
    color: '#06b6d4',
    costShards: 240,
    costCrackStones: 28,
    description: '시공간의 흐름이 고요해지며 신속의 경지에 들어서 모든 행동과 판단이 번개보다 빨라집니다.',
    bonuses: { spdFlat: 15, critRate: 0.08 },
  },
  {
    tier: 7,
    nameKR: '칠성경 · 원영',
    hanja: '元嬰',
    title: '불멸의 영혼체',
    emoji: '👑🔥',
    color: '#ec4899',
    costShards: 320,
    costCrackStones: 36,
    description: '육신 안에 불멸의 성광 영혼(원영)이 탄생하여 공격력과 원소 공명이 폭발적으로 도약합니다.',
    bonuses: { atkPercent: 40, elementalDmgPercent: 40 },
  },
  {
    tier: 8,
    nameKR: '팔성경 · 화신',
    hanja: '化神',
    title: '우주의 화신',
    emoji: '🔱✨',
    color: '#f43f5e',
    costShards: 420,
    costCrackStones: 45,
    description: '삼라만상의 자연 그 자체가 되어 호흡하며 어떤 파멸적인 타격도 무위로 돌립니다.',
    bonuses: { hpPercent: 50, defPercent: 40, damageReduction: 0.05 },
  },
  {
    tier: 9,
    nameKR: '구성경 · 천외천',
    hanja: '天外天',
    title: '무극의 천존',
    emoji: '🌌👑✨',
    color: '#fbbf24',
    costShards: 600,
    costCrackStones: 60,
    description: '필멸의 윤회를 완전히 초월하여 우주의 법칙 그 자체로 군림합니다. 모든 최종 피해량이 2배로 증폭됩니다.',
    bonuses: {
      finalDmgMultiplier: 2.0,
      atkPercent: 50,
      hpPercent: 50,
      damageReduction: 0.08,
    },
  },
];

export interface CumulativeAwakeningStats {
  tier: number;
  title: string;
  atkPercent: number;
  hpPercent: number;
  defPercent: number;
  spdFlat: number;
  critRate: number;
  critDmg: number;
  elementalDmgPercent: number;
  damageReduction: number;
  finalDmgMultiplier: number;
}

/**
 * Returns whether hero can break through to next tier.
 */
export function canAwakenNextTier(
  currentTier: number,
  availableShards: number,
  availableCrackStones: number,
): boolean {
  if (currentTier >= MAX_AWAKENING_TIER) return false;
  const nextDef = AWAKENING_TIERS[currentTier]; // tier 0 -> index 0 (Tier 1)
  if (!nextDef) return false;
  return (
    availableShards >= nextDef.costShards &&
    availableCrackStones >= nextDef.costCrackStones
  );
}

/**
 * Executes breakthrough to next tier.
 */
export function attemptAwakenNextTier(
  currentTier: number,
  availableShards: number,
  availableCrackStones: number,
): {
  success: boolean;
  newTier: number;
  shardsSpent: number;
  crackStonesSpent: number;
  message: string;
} {
  if (currentTier >= MAX_AWAKENING_TIER) {
    return {
      success: false,
      newTier: currentTier,
      shardsSpent: 0,
      crackStonesSpent: 0,
      message: '이미 천외천(구성경) 최고 경지에 도달했습니다.',
    };
  }

  const nextDef = AWAKENING_TIERS[currentTier];
  if (!nextDef) {
    return {
      success: false,
      newTier: currentTier,
      shardsSpent: 0,
      crackStonesSpent: 0,
      message: '유효하지 않은 각성 단계입니다.',
    };
  }

  if (availableShards < nextDef.costShards) {
    return {
      success: false,
      newTier: currentTier,
      shardsSpent: 0,
      crackStonesSpent: 0,
      message: `별빛 파편이 부족합니다. (필요: ${nextDef.costShards}개)`,
    };
  }

  if (availableCrackStones < nextDef.costCrackStones) {
    return {
      success: false,
      newTier: currentTier,
      shardsSpent: 0,
      crackStonesSpent: 0,
      message: `차원 균열석이 부족합니다. (필요: ${nextDef.costCrackStones}개)`,
    };
  }

  const newTier = currentTier + 1;
  return {
    success: true,
    newTier,
    shardsSpent: nextDef.costShards,
    crackStonesSpent: nextDef.costCrackStones,
    message: `축하합니다! [${nextDef.nameKR}] 돌파에 성공하여 [${nextDef.title}] 칭호를 획득했습니다!`,
  };
}

/**
 * Computes all cumulative bonus stats from current awakening tier.
 */
export function computeCumulativeAwakeningStats(currentTier: number): CumulativeAwakeningStats {
  const stats: CumulativeAwakeningStats = {
    tier: currentTier,
    title: currentTier > 0 ? AWAKENING_TIERS[currentTier - 1].title : '필멸자 (미각성)',
    atkPercent: 0,
    hpPercent: 0,
    defPercent: 0,
    spdFlat: 0,
    critRate: 0,
    critDmg: 0,
    elementalDmgPercent: 0,
    damageReduction: 0,
    finalDmgMultiplier: 1.0,
  };

  const clampedTier = Math.min(MAX_AWAKENING_TIER, Math.max(0, currentTier));
  for (let i = 0; i < clampedTier; i++) {
    const t = AWAKENING_TIERS[i];
    if (t.bonuses.atkPercent) stats.atkPercent += t.bonuses.atkPercent;
    if (t.bonuses.hpPercent) stats.hpPercent += t.bonuses.hpPercent;
    if (t.bonuses.defPercent) stats.defPercent += t.bonuses.defPercent;
    if (t.bonuses.spdFlat) stats.spdFlat += t.bonuses.spdFlat;
    if (t.bonuses.critRate) stats.critRate += t.bonuses.critRate;
    if (t.bonuses.critDmg) stats.critDmg += t.bonuses.critDmg;
    if (t.bonuses.elementalDmgPercent) stats.elementalDmgPercent += t.bonuses.elementalDmgPercent;
    if (t.bonuses.damageReduction) stats.damageReduction += t.bonuses.damageReduction;
    if (t.bonuses.finalDmgMultiplier) stats.finalDmgMultiplier *= t.bonuses.finalDmgMultiplier;
  }

  return stats;
}
