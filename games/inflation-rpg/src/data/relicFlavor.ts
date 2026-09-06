/**
 * relicFlavor.ts — C1071: Celestial Star Relics Mythology Lore & Blacksmith Chants.
 *
 * Provides celestial astronomy mythology for the 4 legendary star relics
 * and stirring blacksmith socketing hammer chants.
 */

import type { CelestialRelicType } from '../types';

export interface RelicMythologyLore {
  koreanName: string;
  hanja: string;
  constellation: string;
  mythologicalOrigin: string;
  socketChant: string;
  unsocketQuote: string;
}

export const CELESTIAL_RELIC_LORE: Record<CelestialRelicType, RelicMythologyLore> = {
  polaris_eye: {
    koreanName: '북극성의 눈',
    hanja: '北極之眼',
    constellation: '작은곰자리 (북극성 · 天極)',
    mythologicalOrigin:
      '하늘의 모든 별들이 그 주위를 맴돌아도 홀로 흔들리지 않는 북천의 중심축. 환영과 거짓을 꿰뚫고 항상 진실된 급소만을 비춘다.',
    socketChant:
      '북천의 영원한 중심이여! 어둠을 뚫고 적의 급소를 정밀히 겨누는 혜안으로 벼려져라!',
    unsocketQuote:
      '장비의 홈에서 맑고 차가운 북극의 영기가 부드럽게 빠져나와 본래의 성핵으로 돌아갑니다.',
  },
  sirius_fang: {
    koreanName: '시리우스의 송곳니',
    hanja: '天狼之牙',
    constellation: '큰개자리 (천랑성 · 天狼)',
    mythologicalOrigin:
      '겨울 밤하늘에서 가장 푸르고 눈부시게 빛나는 천랑성의 송곳니. 신화 속 거신과 마룡들의 두개골을 부숴온 흉포한 살기를 품고 있다.',
    socketChant:
      '하늘 늑대의 푸른 송곳니여! 전장을 피로 물들이며 그 어떤 거대한 괴수라도 갈기갈기 찢어발겨라!',
    unsocketQuote:
      '타오르던 천랑성의 푸른 섬광이 잦아들며 늑대의 야성이 다시 침묵 속으로 깃듭니다.',
  },
  vega_veil: {
    koreanName: '직녀성의 베일',
    hanja: '織女之紗',
    constellation: '거문고자리 (직녀성 · 織女)',
    mythologicalOrigin:
      '은하수를 사이에 두고 은빛 성운의 실을 자아내는 직녀의 비단 베일. 적의 파멸적인 강타마저 밤하늘의 은하수로 흩날려 흘려보낸다.',
    socketChant:
      '은하수를 수놓은 성운의 실타래여! 적의 맹공을 비단처럼 부드럽게 흩날려 생명을 수호하라!',
    unsocketQuote:
      '신비로운 은하수의 장막이 흩어지며 비단결 같은 성운의 숨결이 손끝에 맴돕니다.',
  },
  antares_heart: {
    koreanName: '안타레스의 심장',
    hanja: '大火之心',
    constellation: '전갈자리 (심수이 · 心宿二)',
    mythologicalOrigin:
      '화성(熒惑)과 붉은빛을 겨룬다는 전갈자리의 심장이자 태고의 대화(大火). 억눌린 원소의 기운을 임계점까지 압축하여 폭발시키는 위엄을 지닌다.',
    socketChant:
      '대화(大火)의 붉은 심장이여! 삼라만상의 원소를 집어삼켜 한 줌의 재로 화할 파멸의 불길로 폭발하라!',
    unsocketQuote:
      '작열하던 대화의 붉은 불씨가 사그라지며 성핵이 평온한 휴식을 맞이합니다.',
  },
};

/**
 * Returns the blacksmith hammer chant when socketing a celestial star relic.
 */
export function getRelicSocketChant(relicId: CelestialRelicType): string {
  return (
    CELESTIAL_RELIC_LORE[relicId]?.socketChant ??
    '천상의 별빛이 무구의 홈에 깃들어 영원한 수호를 맹세합니다.'
  );
}

/**
 * Returns the narrative quote when unsocketing / extracting a relic.
 */
export function getRelicUnsocketQuote(relicId: CelestialRelicType): string {
  return (
    CELESTIAL_RELIC_LORE[relicId]?.unsocketQuote ??
    '성유물이 무구에서 안전하게 추출되었습니다.'
  );
}
