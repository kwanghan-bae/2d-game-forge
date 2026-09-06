/**
 * relicTransmutationLore.ts — C1102: Ancient Constellation Blessings & Apex Relic Lore.
 *
 * Chronicles the awakening of ancient stellar divinities within the 4 Celestial Star Relics,
 * divine transmutation prayers, and Hall of Sagas inscriptions.
 */

import type { TransmutedRelicType } from '../systems/celestialRelicTransmutation';

export interface TransmutedRelicLoreEntry {
  type: TransmutedRelicType;
  deityNameKR: string;
  originMyth: string;
  transmutationPrayer: string;
}

export const APEX_RELIC_LORE: Record<TransmutedRelicType, TransmutedRelicLoreEntry> = {
  polaris_celestial_eye: {
    type: 'polaris_celestial_eye',
    deityNameKR: '북극성령 (Polaris Archon)',
    originMyth:
      '하늘의 중심을 지키는 태초의 북극성령이 어둠의 장벽을 꿰뚫기 위해 심안(心眼)을 개안한 보석. 삼라만상의 허점과 차원의 틈새를 남김없이 드러낸다.',
    transmutationPrayer:
      '하늘의 축을 쥐고 흔드는 북극의 성령이여, 내 칼끝에 눈을 떠 모든 혼돈의 약점을 직시케 하소서!',
  },
  sirius_celestial_fang: {
    type: 'sirius_celestial_fang',
    deityNameKR: '천랑신수 (Sirius Calamity Wolf)',
    originMyth:
      '은하의 멸망을 집어삼켰던 전설의 은빛 천랑신수가 남긴 불멸의 송곳니. 어떤 단단한 차원의 결계도 단숨에 찢어발겨 절대적인 치명상을 입힌다.',
    transmutationPrayer:
      '멸망의 겁화를 물어뜯은 천랑의 이빨이여, 적의 시공간을 베어 피의 열상을 아로새기소서!',
  },
  vega_celestial_veil: {
    type: 'vega_celestial_veil',
    deityNameKR: '직녀성모 (Vega Celestial Matron)',
    originMyth:
      '은하수를 한 올 한 올 엮어 시공간의 오염을 정화하는 직녀성모의 절대적인 은빛 비단. 어떤 사악한 상태이상도 닿는 순간 순수한 빛으로 흩어진다.',
    transmutationPrayer:
      '은하수를 수놓는 직녀의 불멸 장막이여, 영혼을 감싸 혼돈의 침식을 원천 차단하소서!',
  },
  antares_celestial_heart: {
    type: 'antares_celestial_heart',
    deityNameKR: '대화심존 (Antares Immortal Core)',
    originMyth:
      '여름밤 가장 붉게 타오르는 대화(大火)의 심장이 깃든 불사의 결정. 죽음의 문턱에 닿았을 때 불사조의 화염을 토해내며 생명을 되살려낸다.',
    transmutationPrayer:
      '영겁을 타오르는 대화의 불멸 심장이여, 육신이 스러질 때 불사조의 재 속에서 나를 다시 일으키소서!',
  },
};

/**
 * Returns narrative lore for transmuted relic.
 */
export function getTransmutedRelicLore(type: TransmutedRelicType): TransmutedRelicLoreEntry {
  return APEX_RELIC_LORE[type];
}

/**
 * Returns transmutation prayer.
 */
export function getTransmutationPrayer(type: TransmutedRelicType): string {
  return APEX_RELIC_LORE[type].transmutationPrayer;
}

/**
 * Formats saga inscription based on transmuted relic count.
 */
export function formatApexRelicSagaEntry(transmutedCount: number): string {
  if (transmutedCount >= 4) {
    return '4대 천상 성유물의 완전초월 진화를 완수하여 고대 성좌 신들의 완전한 축복을 손에 넣었다.';
  }
  return `고대 성유물 ${transmutedCount}개를 초월 진화시켜 천상의 성광을 각성시켰다.`;
}
