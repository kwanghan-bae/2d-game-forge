import type { Trait, TraitId } from '../cycle/traits';

// 16 traits from spec §16. Magnitudes are PLACEHOLDER — Phase Sim-G balance pass tunes.
// Behavior-influencing traits (탐험가/보스사냥꾼 등) have minimal stat mods here;
// their behavior effects land in Sim-C HeroDecisionAI.
export const TRAIT_CATALOG: Record<TraitId, Trait> = {
  t_challenge: {
    id: 't_challenge',
    nameKR: '도전적',
    descKR: '강한 적 추구. EXP 가 늘고 위험 회피가 줄어든다.',
    unlockTier: 'base',
    mods: { expMul: 1.15, hpMul: 0.95 },
  },
  t_timid: {
    id: 't_timid',
    nameKR: '소극적',
    descKR: '안전한 적부터. 생존율이 높지만 EXP 가 적다.',
    unlockTier: 'base',
    mods: { hpMul: 1.15, expMul: 0.9 },
  },
  t_thrill: {
    id: 't_thrill',
    nameKR: '위험을 즐김',
    descKR: '위험한 노드를 우선. 공격력이 늘지만 방어가 약해진다.',
    unlockTier: 'base',
    mods: { atkMul: 1.2, hpMul: 0.85 },
  },
  t_genius: {
    id: 't_genius',
    nameKR: '천재',
    descKR: 'EXP 획득량이 늘어난다.',
    unlockTier: 'base',
    mods: { expMul: 1.2 },
  },
  t_fragile: {
    id: 't_fragile',
    nameKR: '허약함',
    descKR: 'HP 와 방어가 약해진다. 다른 trait 의 강점을 위한 cost.',
    unlockTier: 'base',
    mods: { hpMul: 0.7, atkMul: 0.85 },
  },
  t_terminal_genius: {
    id: 't_terminal_genius',
    nameKR: '시한부 역대급 천재',
    descKR: '모든 스탯과 EXP 가 폭발. 대신 BP 가 두 배로 소모된다.',
    unlockTier: 'rare',
    mods: { hpMul: 1.3, atkMul: 1.3, expMul: 1.5, bpCostMul: 2.0 },
  },
  t_explorer: {
    id: 't_explorer',
    nameKR: '탐험가',
    descKR: '보너스 챔버와 사당 노드를 선호한다. (Sim-C 에서 동작)',
    unlockTier: 'base',
    mods: { goldMul: 1.1 },
  },
  t_berserker: {
    id: 't_berserker',
    nameKR: '광전사',
    descKR: 'HP 가 낮을수록 공격력이 늘어난다. (Sim-G 에서 정식 동작)',
    unlockTier: 'base',
    mods: { atkMul: 1.1, hpMul: 0.9 },
  },
  t_miser: {
    id: 't_miser',
    nameKR: '수전노',
    descKR: '골드 획득이 늘지만 회복을 아낀다.',
    unlockTier: 'base',
    mods: { goldMul: 1.25, hpMul: 0.95 },
  },
  t_boss_hunter: {
    id: 't_boss_hunter',
    nameKR: '보스 사냥꾼',
    descKR: '보스를 정조준. 일반 적에 대한 EXP 가 줄지만 보스에서 큰 보상. (Sim-C 에서 정식 동작)',
    unlockTier: 'mid',
    mods: { expMul: 0.95 },
  },
  t_fortune: {
    id: 't_fortune',
    nameKR: '운명론자',
    descKR: '운에 맡긴다. 회복 능력이 약하지만 골드 행운이 강하다.',
    unlockTier: 'mid',
    mods: { goldMul: 1.2, hpMul: 0.9 },
  },
  t_zealot: {
    id: 't_zealot',
    nameKR: '광신도',
    descKR: '사당과 NPC 의 효과가 강해진다. (Sim-C 에서 정식 동작)',
    unlockTier: 'rare',
    mods: { expMul: 0.9 },
  },
  t_swift: {
    id: 't_swift',
    nameKR: '신속',
    descKR: '빠르게 진행되어 cycle 이 짧다. 데미지가 약간 낮다.',
    unlockTier: 'base',
    mods: { atkMul: 0.85, bpCostMul: 0.9 },
  },
  t_iron: {
    id: 't_iron',
    nameKR: '강철의지',
    descKR: '방어가 강해지지만 공격이 약하다.',
    unlockTier: 'base',
    mods: { hpMul: 1.3, atkMul: 0.85 },
  },
  t_prodigy: {
    id: 't_prodigy',
    nameKR: '후천적 영재',
    descKR: 'cycle 후반에 진가를 발휘. (Sim-G 가 BP 진행 가중치 적용)',
    unlockTier: 'mid',
    mods: { expMul: 1.1, hpMul: 0.95 },
  },
  t_lucky: {
    id: 't_lucky',
    nameKR: '행운아',
    descKR: '모든 RNG 굴림에 가벼운 양 buff.',
    unlockTier: 'base',
    mods: { goldMul: 1.15 },
  },
};

export const TRAIT_IDS: readonly TraitId[] = Object.keys(TRAIT_CATALOG) as TraitId[];

export const BASE_TRAIT_IDS: readonly TraitId[] = TRAIT_IDS.filter(
  id => TRAIT_CATALOG[id].unlockTier === 'base',
);
