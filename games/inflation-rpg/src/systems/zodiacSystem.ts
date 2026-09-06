/**
 * zodiacSystem.ts — C1057: Eastern 12 Zodiac Constellations Resonance Engine.
 *
 * Implements 12 celestial guardian constellations (십이지신: 자·축·인·묘·진·사·오·미·신·유·술·해)
 * that grant cumulative global resonance stat amplifications when unlocked via Dimensional Crack Stones.
 */

import type { ZodiacSign } from '../types';

export type { ZodiacSign } from '../types';

export interface ZodiacNodeDef {
  sign: ZodiacSign;
  nameKR: string;
  animalKR: string;
  emoji: string;
  hanja: string;
  costCrackStones: number;
  description: string;
  bonuses: {
    atkPercent?: number;
    defPercent?: number;
    hpPercent?: number;
    spdPercent?: number;
    critRate?: number;
    critDmgPercent?: number;
    elementalDmgPercent?: number;
    expBonusPercent?: number;
    goldBonusPercent?: number;
    damageReduction?: number;
  };
}

export const ZODIAC_DEFINITIONS: Record<ZodiacSign, ZodiacNodeDef> = {
  rat: {
    sign: 'rat',
    nameKR: '자의 성좌 (자수호신)',
    animalKR: '쥐',
    emoji: '🐭',
    hanja: '子',
    costCrackStones: 5,
    description: '민첩한 감각을 깨워 치명타 확률을 영구히 증가시킵니다.',
    bonuses: { critRate: 0.04 },
  },
  ox: {
    sign: 'ox',
    nameKR: '축의 성좌 (축수호신)',
    animalKR: '소',
    emoji: '🐂',
    hanja: '丑',
    costCrackStones: 5,
    description: '불굴의 인내심을 부여하여 단단한 방어력을 구축합니다.',
    bonuses: { defPercent: 6 },
  },
  tiger: {
    sign: 'tiger',
    nameKR: '인의 성좌 (인수호신)',
    animalKR: '호랑이',
    emoji: '🐯',
    hanja: '寅',
    costCrackStones: 8,
    description: '백수의 제왕다운 용맹한 기백으로 공격력을 대폭 끌어올립니다.',
    bonuses: { atkPercent: 6 },
  },
  rabbit: {
    sign: 'rabbit',
    nameKR: '묘의 성좌 (묘수호신)',
    animalKR: '토끼',
    emoji: '🐰',
    hanja: '卯',
    costCrackStones: 8,
    description: '신묘한 발걸음으로 영웅의 기동력과 행동속도를 높입니다.',
    bonuses: { spdPercent: 5 },
  },
  dragon: {
    sign: 'dragon',
    nameKR: '진의 성좌 (진수호신)',
    animalKR: '용',
    emoji: '🐲',
    hanja: '辰',
    costCrackStones: 10,
    description: '천상의 벼락을 다스리는 위엄으로 속성 공격력을 극대화합니다.',
    bonuses: { elementalDmgPercent: 8 },
  },
  snake: {
    sign: 'snake',
    nameKR: '사의 성좌 (사수호신)',
    animalKR: '뱀',
    emoji: '🐍',
    hanja: '巳',
    costCrackStones: 10,
    description: '심오한 통찰력을 선사하여 전투 경험치 획득량을 늘립니다.',
    bonuses: { expBonusPercent: 8 },
  },
  horse: {
    sign: 'horse',
    nameKR: '오의 성좌 (오수호신)',
    animalKR: '말',
    emoji: '🐎',
    hanja: '午',
    costCrackStones: 12,
    description: '질풍노도의 돌파력으로 공격력과 행동속도를 함께 강화합니다.',
    bonuses: { atkPercent: 5, spdPercent: 4 },
  },
  goat: {
    sign: 'goat',
    nameKR: '미의 성좌 (미수호신)',
    animalKR: '양',
    emoji: '🐐',
    hanja: '未',
    costCrackStones: 12,
    description: '온화한 조화의 기운으로 최대 생명력을 증폭시킵니다.',
    bonuses: { hpPercent: 8 },
  },
  monkey: {
    sign: 'monkey',
    nameKR: '신의 성좌 (신수호신)',
    animalKR: '원숭이',
    emoji: '🐒',
    hanja: '申',
    costCrackStones: 15,
    description: '영리한 재치로 마물 토벌 시 더 많은 금전을 획득합니다.',
    bonuses: { goldBonusPercent: 10 },
  },
  rooster: {
    sign: 'rooster',
    nameKR: '유의 성좌 (유수호신)',
    animalKR: '닭',
    emoji: '🐓',
    hanja: '酉',
    costCrackStones: 15,
    description: '어둠을 가르는 여명의 일격으로 치명타 피해를 폭증시킵니다.',
    bonuses: { critDmgPercent: 8, critRate: 0.02 },
  },
  dog: {
    sign: 'dog',
    nameKR: '술의 성좌 (술수호신)',
    animalKR: '개',
    emoji: '🐕',
    hanja: '戌',
    costCrackStones: 18,
    description: '충직한 수호의 결계로 적에게 받는 모든 피해를 직접 경감합니다.',
    bonuses: { damageReduction: 0.03 },
  },
  boar: {
    sign: 'boar',
    nameKR: '해의 성좌 (해수호신)',
    animalKR: '돼지',
    emoji: '🐗',
    hanja: '亥',
    costCrackStones: 20,
    description: '대지의 무한한 풍요를 담아 생명력과 금전 획득량을 최고조로 끌어올립니다.',
    bonuses: { hpPercent: 10, goldBonusPercent: 8 },
  },
};

export const ALL_ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'rat',
  'ox',
  'tiger',
  'rabbit',
  'dragon',
  'snake',
  'horse',
  'goat',
  'monkey',
  'rooster',
  'dog',
  'boar',
];

export interface ZodiacResonanceBonus {
  atkPercent: number;
  defPercent: number;
  hpPercent: number;
  spdPercent: number;
  critRate: number;
  critDmgPercent: number;
  elementalDmgPercent: number;
  expBonusPercent: number;
  goldBonusPercent: number;
  damageReduction: number;
  unlockedCount: number;
}

export const EMPTY_ZODIAC_BONUS: ZodiacResonanceBonus = {
  atkPercent: 0,
  defPercent: 0,
  hpPercent: 0,
  spdPercent: 0,
  critRate: 0,
  critDmgPercent: 0,
  elementalDmgPercent: 0,
  expBonusPercent: 0,
  goldBonusPercent: 0,
  damageReduction: 0,
  unlockedCount: 0,
};

/**
 * Checks if a zodiac constellation node can be unlocked.
 */
export function canUnlockZodiacNode(
  sign: ZodiacSign,
  availableCrackStones: number,
  unlockedSigns: ZodiacSign[] = [],
): boolean {
  if (unlockedSigns.includes(sign)) return false;
  const def = ZODIAC_DEFINITIONS[sign];
  return availableCrackStones >= def.costCrackStones;
}

export interface UnlockZodiacResult {
  success: boolean;
  newUnlocked: ZodiacSign[];
  stonesSpent: number;
  message: string;
}

/**
 * Unlocks a zodiac constellation node.
 */
export function unlockZodiacNode(
  sign: ZodiacSign,
  availableCrackStones: number,
  unlockedSigns: ZodiacSign[] = [],
): UnlockZodiacResult {
  if (unlockedSigns.includes(sign)) {
    return {
      success: false,
      newUnlocked: unlockedSigns,
      stonesSpent: 0,
      message: '이미 해금된 성좌입니다.',
    };
  }

  const def = ZODIAC_DEFINITIONS[sign];
  if (availableCrackStones < def.costCrackStones) {
    return {
      success: false,
      newUnlocked: unlockedSigns,
      stonesSpent: 0,
      message: `차원 균열석이 부족합니다. (${def.costCrackStones}개 필요)`,
    };
  }

  return {
    success: true,
    newUnlocked: [...unlockedSigns, sign],
    stonesSpent: def.costCrackStones,
    message: `✨ [${def.nameKR}]이(가) 밤하늘에 빛나기 시작했습니다!`,
  };
}

/**
 * Computes aggregated global resonance bonuses across all unlocked constellations.
 */
export function computeZodiacResonance(unlockedSigns: ZodiacSign[] = []): ZodiacResonanceBonus {
  const total: ZodiacResonanceBonus = { ...EMPTY_ZODIAC_BONUS, unlockedCount: unlockedSigns.length };

  for (const sign of unlockedSigns) {
    const def = ZODIAC_DEFINITIONS[sign];
    if (!def) continue;

    const b = def.bonuses;
    if (b.atkPercent) total.atkPercent += b.atkPercent;
    if (b.defPercent) total.defPercent += b.defPercent;
    if (b.hpPercent) total.hpPercent += b.hpPercent;
    if (b.spdPercent) total.spdPercent += b.spdPercent;
    if (b.critRate) total.critRate += b.critRate;
    if (b.critDmgPercent) total.critDmgPercent += b.critDmgPercent;
    if (b.elementalDmgPercent) total.elementalDmgPercent += b.elementalDmgPercent;
    if (b.expBonusPercent) total.expBonusPercent += b.expBonusPercent;
    if (b.goldBonusPercent) total.goldBonusPercent += b.goldBonusPercent;
    if (b.damageReduction) total.damageReduction += b.damageReduction;
  }

  return total;
}
