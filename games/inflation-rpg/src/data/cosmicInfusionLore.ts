/**
 * cosmicInfusionLore.ts — C1119: Celestial Infusion Metallurgy Lore & Artisan Incantations.
 *
 * Chronicles the ancient cosmic blacksmith hymns, affix incantations,
 * and Hall of Sagas inscriptions for the Celestial Infusion system.
 */

import type { CosmicAffixType } from '../systems/cosmicInfusion';

export interface CosmicInfusionLoreEntry {
  type: CosmicAffixType;
  artisanTitle: string;
  infusionChant: string;
  appraisalQuote: string;
  sagaChronicle: string;
}

export const COSMIC_INFUSION_LORE: Record<CosmicAffixType, CosmicInfusionLoreEntry> = {
  celestial_sharpness: {
    type: 'celestial_sharpness',
    artisanTitle: '은하의 대장장이 헤파이스토스',
    infusionChant:
      '별들의 빛을 벼려 날을 세우니, 차원의 장벽마저 베어내는 천상의 예리함이여 이 무구에 깃들라!',
    appraisalQuote:
      '보라! 허공을 스치기만 해도 공간이 갈라지는 소리가 들리는구나. 어떠한 방어도 이 칼날을 막아설 수 없으리라.',
    sagaChronicle:
      '천상의 예리함을 주입하여 차원의 틈새마저 찢어발기는 신성한 무구를 완성하였다.',
  },
  astral_fortitude: {
    type: 'astral_fortitude',
    artisanTitle: '성간 금속술사 아틀라스',
    infusionChant:
      '초신성의 압력을 견뎌낸 성간의 합금이여, 어떤 파멸의 파도에도 흔들리지 않는 불굴의 방벽을 굳혀라!',
    appraisalQuote:
      '완벽하군. 블랙홀의 중력조차 이 단단함을 부수지 못할 것이다. 그대의 육신은 이제 불멸의 성벽과 같다.',
    sagaChronicle:
      '성간의 불굴을 벼려내어 우주의 모든 파멸과 침식을 차단하는 철벽의 방어구를 구축하였다.',
  },
  singularity_might: {
    type: 'singularity_might',
    artisanTitle: '특이점의 연금술사 오리온',
    infusionChant:
      '무한한 질량이 응축된 특이점의 핵이여, 종말을 빚어내는 파괴의 숨결을 이 장비에 각인하라!',
    appraisalQuote:
      '이 무시무시한 박동이 느껴지는가? 닿는 모든 것을 무로 돌려보낼 파멸의 에너지가 용틀임치고 있다.',
    sagaChronicle:
      '특이점의 위력을 융합하여 적의 존재 자체를 무극의 특이점으로 분쇄하는 절대 무구를 탄생시켰다.',
  },
  cosmic_celerity: {
    type: 'cosmic_celerity',
    artisanTitle: '시공간 조율사 헤르메스',
    infusionChant:
      '빛보다 빠른 타키온의 흐름이여, 인과율을 미끄러지듯 질주하는 우주의 신속함을 부여하라!',
    appraisalQuote:
      '눈 깜빡할 새도 없이 차원을 넘나드는구나. 적이 그대의 그림자를 인식하기도 전에 칼끝은 이미 심장을 꿰뚫었을 것이다.',
    sagaChronicle:
      '우주의 신속함을 각인하여 시공간의 흐름을 앞질러 전장을 지배하는 신속의 보구를 완성하였다.',
  },
};

/**
 * Returns lore entry for a given cosmic affix.
 */
export function getCosmicInfusionLore(type: CosmicAffixType): CosmicInfusionLoreEntry {
  return COSMIC_INFUSION_LORE[type];
}

/**
 * Formats a chronicle inscription for the Hall of Sagas upon infusing equipment.
 */
export function formatCosmicInfusionSagaEntry(
  affixType: CosmicAffixType,
  gearName: string,
  heroName: string
): string {
  const lore = getCosmicInfusionLore(affixType);
  return `[천상 주입] 용사 ${heroName}이(가) [${gearName}]에 ${lore.sagaChronicle}`;
}
