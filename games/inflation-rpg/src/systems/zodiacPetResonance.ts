/**
 * zodiacPetResonance.ts — C1061: Cross-System Zodiac & Divine Beast Resonance Engine.
 *
 * Implements harmonious resonance when the active companion beast aligns with its
 * celestial counterpart constellation in the 12 Zodiac (십이지신):
 * - White Tiger (백호) + Tiger (인수호성) -> 호랑이의 영험한 포효 (ATK +10%, Crit Rate +5%)
 * - Azure Dragon (청룡) + Dragon (진수호성) -> 푸른 용의 천벌 (Lightning +12%, SPD +6%)
 * - Vermilion Bird (주작) + Horse (오수호성) -> 불사조의 비상 (Fire +10%, Max HP +5%)
 * - Black Tortoise (현무) + Snake (사수호성) -> 현무의 귀사합일 (DEF +10%, DR +3%)
 */

import type { PetType } from './petSystem';
import type { ZodiacSign } from './zodiacSystem';

export interface ZodiacPetResonanceDef {
  id: string;
  petId: PetType;
  requiredZodiac: ZodiacSign;
  nameKR: string;
  emoji: string;
  description: string;
  bonuses: {
    atkPercent?: number;
    defPercent?: number;
    hpPercent?: number;
    spdPercent?: number;
    critRate?: number;
    elementalDmgPercent?: number;
    damageReduction?: number;
  };
}

export const ZODIAC_PET_RESONANCES: ZodiacPetResonanceDef[] = [
  {
    id: 'tiger_resonance',
    petId: 'white_tiger',
    requiredZodiac: 'tiger',
    nameKR: '호랑이의 영험한 포효',
    emoji: '🐯⚡',
    description: '백호와 인(호랑이)의 성좌가 감응하여 맹수의 투지가 폭발합니다. (공격력 +10%, 치명타율 +5%)',
    bonuses: {
      atkPercent: 10,
      critRate: 0.05,
    },
  },
  {
    id: 'dragon_resonance',
    petId: 'azure_dragon',
    requiredZodiac: 'dragon',
    nameKR: '푸른 용의 천벌',
    emoji: '🐉⚡',
    description: '청룡과 진(용)의 성좌가 결합하여 벼락의 신속함이 깨어납니다. (뇌전 피해 +12%, 행동속도 +6%)',
    bonuses: {
      elementalDmgPercent: 12,
      spdPercent: 6,
    },
  },
  {
    id: 'phoenix_resonance',
    petId: 'vermilion_bird',
    requiredZodiac: 'horse',
    nameKR: '불사조의 태양 비상',
    emoji: '🦅🔥',
    description: '주작과 오(말/태양)의 남방 화기가 화합하여 불사의 생명력을 발휘합니다. (화염 피해 +10%, 최대 체력 +5%)',
    bonuses: {
      elementalDmgPercent: 10,
      hpPercent: 5,
    },
  },
  {
    id: 'tortoise_resonance',
    petId: 'black_tortoise',
    requiredZodiac: 'snake',
    nameKR: '현무의 귀사합일',
    emoji: '🐢🐍',
    description: '현무와 사(뱀)의 영기가 합일하여 뚫을 수 없는 절대 방패를 세웁니다. (방어력 +10%, 피해 감소 +3%)',
    bonuses: {
      defPercent: 10,
      damageReduction: 0.03,
    },
  },
];

export interface ZodiacPetBonus {
  atkPercent: number;
  defPercent: number;
  hpPercent: number;
  spdPercent: number;
  critRate: number;
  elementalDmgPercent: number;
  damageReduction: number;
  activeResonances: ZodiacPetResonanceDef[];
}

export const EMPTY_ZODIAC_PET_BONUS: ZodiacPetBonus = {
  atkPercent: 0,
  defPercent: 0,
  hpPercent: 0,
  spdPercent: 0,
  critRate: 0,
  elementalDmgPercent: 0,
  damageReduction: 0,
  activeResonances: [],
};

/**
 * Returns list of active Zodiac-Pet resonances based on current companion and unlocked constellations.
 */
export function getActiveZodiacPetResonances(
  activePetId: PetType | null,
  unlockedZodiac: ZodiacSign[] = [],
): ZodiacPetResonanceDef[] {
  if (!activePetId) return [];

  return ZODIAC_PET_RESONANCES.filter(
    res => res.petId === activePetId && unlockedZodiac.includes(res.requiredZodiac),
  );
}

/**
 * Computes aggregated stat multipliers and benefits from active Zodiac-Pet synergies.
 */
export function computeZodiacPetResonanceBonus(
  activePetId: PetType | null,
  unlockedZodiac: ZodiacSign[] = [],
): ZodiacPetBonus {
  const activeList = getActiveZodiacPetResonances(activePetId, unlockedZodiac);
  const result: ZodiacPetBonus = {
    ...EMPTY_ZODIAC_PET_BONUS,
    activeResonances: activeList,
  };

  for (const res of activeList) {
    const b = res.bonuses;
    if (b.atkPercent) result.atkPercent += b.atkPercent;
    if (b.defPercent) result.defPercent += b.defPercent;
    if (b.hpPercent) result.hpPercent += b.hpPercent;
    if (b.spdPercent) result.spdPercent += b.spdPercent;
    if (b.critRate) result.critRate += b.critRate;
    if (b.elementalDmgPercent) result.elementalDmgPercent += b.elementalDmgPercent;
    if (b.damageReduction) result.damageReduction += b.damageReduction;
  }

  return result;
}
