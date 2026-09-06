/**
 * celestialRelicTransmutation.ts — C1099: Celestial Relic Transmutation & Apex Abilities Engine.
 *
 * Implements high-tier transmutation for the 4 Celestial Star Relics:
 * 1. polaris_celestial_eye (태초의 북극성안):
 *    - Weakness strikes have 30% chance to trigger Absolute Critical (+200% burst).
 * 2. sirius_celestial_fang (멸겁의 천랑아):
 *    - Once per battle, inflicts Calamity Bleed dealing 10% of enemy Max HP as True Damage.
 * 3. vega_celestial_veil (영원의 직녀라):
 *    - Permanent Debuff & Chaos Erosion immunity + 15% Max HP Cosmic Aegis shield on turn 1.
 * 4. antares_celestial_heart (불멸의 대화심):
 *    - Once per expedition, upon fatal blow, instantly revives hero with 50% Max HP!
 */

import type { CelestialRelicType } from '../types';

export type TransmutedRelicType =
  | 'polaris_celestial_eye'
  | 'sirius_celestial_fang'
  | 'vega_celestial_veil'
  | 'antares_celestial_heart';

export interface TransmutedRelicDef {
  type: TransmutedRelicType;
  baseRelicType: CelestialRelicType;
  nameKR: string;
  hanja: string;
  emoji: string;
  color: string;
  costShards: number;
  costCrackStones: number;
  costGold: number;
  description: string;
  apexSkillName: string;
  apexSkillDescription: string;
}

export const TRANSMUTED_RELICS: Record<TransmutedRelicType, TransmutedRelicDef> = {
  polaris_celestial_eye: {
    type: 'polaris_celestial_eye',
    baseRelicType: 'polaris_eye',
    nameKR: '태초의 북극성안',
    hanja: '太初北極星眼',
    emoji: '👁️✨',
    color: '#38bdf8',
    costShards: 120,
    costCrackStones: 20,
    costGold: 300000,
    description: '북극성의 진정한 성광이 눈을 떠, 모든 약점과 차원의 틈새를 꿰뚫어 봅니다.',
    apexSkillName: '태초의 직관',
    apexSkillDescription: '약점 속성 타격 시 30% 확률로 절대 극딜(+200% 피해)을 가합니다.',
  },
  sirius_celestial_fang: {
    type: 'sirius_celestial_fang',
    baseRelicType: 'sirius_fang',
    nameKR: '멸겁의 천랑아',
    hanja: '滅劫天狼牙',
    emoji: '🐺🗡️',
    color: '#34d399',
    costShards: 120,
    costCrackStones: 20,
    costGold: 300000,
    description: '천랑성의 포효가 깃들어 시공간의 뼈마디를 부러뜨리는 절대적인 파괴력의 송곳니입니다.',
    apexSkillName: '멸겁의 열상',
    apexSkillDescription: '전투 개시 시 적에게 최대 체력의 10%에 해당하는 고정 절대 피해를 입힙니다.',
  },
  vega_celestial_veil: {
    type: 'vega_celestial_veil',
    baseRelicType: 'vega_veil',
    nameKR: '영원의 직녀라',
    hanja: '永遠織女羅',
    emoji: '🌌🛡️',
    color: '#c084fc',
    costShards: 120,
    costCrackStones: 20,
    costGold: 300000,
    description: '은하수를 엮어 짠 불멸의 비단으로, 혼돈의 모든 침식과 악영향을 원천 차단합니다.',
    apexSkillName: '영원의 성막',
    apexSkillDescription: '모든 상태이상 및 침식 면역, 1턴 개시 시 최대 체력의 15% 보호막을 전개합니다.',
  },
  antares_celestial_heart: {
    type: 'antares_celestial_heart',
    baseRelicType: 'antares_heart',
    nameKR: '불멸의 대화심',
    hanja: '不滅大火心',
    emoji: '❤️‍🔥👑',
    color: '#f43f5e',
    costShards: 120,
    costCrackStones: 20,
    costGold: 300000,
    description: '타오르는 화성의 성핵이 심장에 깃들어, 죽음의 문턱에서 불사조처럼 부활합니다.',
    apexSkillName: '불사조의 환생',
    apexSkillDescription: '원정 중 치명적인 피해를 입어 쓰러질 때, 1회에 한해 최대 체력의 50%로 즉시 부활합니다.',
  },
};

export const BASE_TO_TRANSMUTED: Record<CelestialRelicType, TransmutedRelicType> = {
  polaris_eye: 'polaris_celestial_eye',
  sirius_fang: 'sirius_celestial_fang',
  vega_veil: 'vega_celestial_veil',
  antares_heart: 'antares_celestial_heart',
};

/**
 * Checks if player can transmute a base relic.
 */
export function canTransmuteRelic(
  baseType: CelestialRelicType,
  shards: number,
  crackStones: number,
  gold: number,
): boolean {
  const transType = BASE_TO_TRANSMUTED[baseType];
  const def = TRANSMUTED_RELICS[transType];
  return (
    shards >= def.costShards &&
    crackStones >= def.costCrackStones &&
    gold >= def.costGold
  );
}

/**
 * Executes relic transmutation.
 */
export function transmuteRelic(
  baseType: CelestialRelicType,
  shards: number,
  crackStones: number,
  gold: number,
): {
  success: boolean;
  transmutedType: TransmutedRelicType;
  shardsSpent: number;
  crackStonesSpent: number;
  goldSpent: number;
  message: string;
} {
  const transType = BASE_TO_TRANSMUTED[baseType];
  const def = TRANSMUTED_RELICS[transType];

  if (shards < def.costShards || crackStones < def.costCrackStones || gold < def.costGold) {
    return {
      success: false,
      transmutedType: transType,
      shardsSpent: 0,
      crackStonesSpent: 0,
      goldSpent: 0,
      message: '성유물 초월 진화에 필요한 재화가 부족합니다.',
    };
  }

  return {
    success: true,
    transmutedType: transType,
    shardsSpent: def.costShards,
    crackStonesSpent: def.costCrackStones,
    goldSpent: def.costGold,
    message: `축하합니다! 성유물이 초월 등급 [${def.nameKR}]으로 진화하여 고유 각성기 [${def.apexSkillName}]을 획득했습니다!`,
  };
}

/**
 * Evaluates the revive trigger for Antares Celestial Heart.
 */
export function evaluateAntaresRevive(
  currentHp: number,
  heroMaxHp: number,
  hasTransmutedHeart: boolean,
  alreadyUsedRevive: boolean,
): { revived: boolean; newHp: number; usedNow: boolean } {
  if (currentHp <= 0 && hasTransmutedHeart && !alreadyUsedRevive) {
    return {
      revived: true,
      newHp: Math.floor(heroMaxHp * 0.50),
      usedNow: true,
    };
  }
  return {
    revived: false,
    newHp: currentHp,
    usedNow: false,
  };
}
