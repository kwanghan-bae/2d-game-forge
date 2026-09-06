/**
 * zodiacFlavor.ts — C1060: Eastern 12 Zodiac Constellations Lore & Awakening Quotes.
 *
 * Provides Korean traditional astronomy (천상열차분야지도) and folkloric lore
 * for all 12 celestial guardian constellations, alongside stirring awakening quotes.
 */

import type { ZodiacSign } from '../systems/zodiacSystem';

export interface ZodiacFolkloreLore {
  celestialDomain: string;
  mythicalOrigin: string;
  awakeningQuote: string;
}

export const ZODIAC_FOLKLORE_LORE: Record<ZodiacSign, ZodiacFolkloreLore> = {
  rat: {
    celestialDomain: '북방 감(坎)방의 첫 성좌 · 자수호성',
    mythicalOrigin: '깊은 밤의 시작을 알리는 영민한 수호성으로, 어둠 속에서도 만물의 숨결을 감지한다.',
    awakeningQuote: '밤하늘의 첫 번째 별빛이 깨어나 어둠 속에서도 적의 약점을 꿰뚫으리라.',
  },
  ox: {
    celestialDomain: '북동방 간(艮)방의 대지 성좌 · 축수호성',
    mythicalOrigin: '천 년 동안 대지를 일군 우직한 신성으로, 어떤 풍파에도 흔들리지 않는 굳건함을 지닌다.',
    awakeningQuote: '천 년을 묵묵히 밭 갈던 우직한 힘이 불굴의 방패로 솟구친다.',
  },
  tiger: {
    celestialDomain: '동방 인(寅)방의 산군 수호성 · 인수호성',
    mythicalOrigin: '백두대간의 정기를 품은 영험한 산군(山君)이자 백수의 제왕으로, 포효 한 번으로 마물들을 무릎 꿇린다.',
    awakeningQuote: '산군(山君)의 노호성이 밤하늘을 흔드니, 베지 못할 마물이 없도다.',
  },
  rabbit: {
    celestialDomain: '동방 진(震)방의 달빛 성좌 · 묘수호성',
    mythicalOrigin: '달나라 옥토끼의 영민한 발걸음으로, 적의 맹공을 가볍게 뛰어넘는 신묘한 도약력을 준다.',
    awakeningQuote: '달빛 아래 뛰노는 영민한 도약으로 적의 칼날을 비웃으리라.',
  },
  dragon: {
    celestialDomain: '남동방 손(巽)방의 뇌우 성좌 · 진수호성',
    mythicalOrigin: '여의주를 품고 구름을 가르는 용으로, 천벌의 벼락과 속성의 힘을 주관한다.',
    awakeningQuote: '천둥과 비바람을 거느린 용이 포효하니 온 천지가 진동하노라.',
  },
  snake: {
    celestialDomain: '남방 사(巳)방의 지혜 성좌 · 사수호성',
    mythicalOrigin: '영겁의 세월 동안 허물을 벗으며 삼라만상의 지혜와 통찰을 축적한 영물이다.',
    awakeningQuote: '묵은 껍질을 벗고 삼라만상의 지혜를 얻어 더 높은 경지로 오르리라.',
  },
  horse: {
    celestialDomain: '남방 이(離)방의 천마 성좌 · 오수호성',
    mythicalOrigin: '태양의 화염을 싣고 달리는 천마로, 적진을 단숨에 짓밟는 돌파력을 선사한다.',
    awakeningQuote: '대지를 울리는 천마의 발굽 소리에 사악한 무리들이 길을 비킨다.',
  },
  goat: {
    celestialDomain: '남서방 곤(坤)방의 조화 성좌 · 미수호성',
    mythicalOrigin: '험준한 암벽에서도 온화함을 잃지 않는 양의 신령으로, 풍부한 생명력과 치유를 내린다.',
    awakeningQuote: '험준한 절벽을 노니는 양의 조화로움이 상처 입은 육신을 감싸리라.',
  },
  monkey: {
    celestialDomain: '서방 신(申)방의 기지 성좌 · 신수호성',
    mythicalOrigin: '변화무쌍한 도술과 영특함을 지닌 제천대성의 후예로, 재화와 보물을 끌어당긴다.',
    awakeningQuote: '변화무쌍한 도술과 기지로 황금빛 재화를 거머쥐리라.',
  },
  rooster: {
    celestialDomain: '서방 유(酉)방의 여명 성좌 · 유수호성',
    mythicalOrigin: '어둠의 장막을 찢고 태양을 부르는 새벽의 전령으로, 날카로운 일섬의 치명타를 내린다.',
    awakeningQuote: '어둠을 몰아내고 새벽을 알리는 일성이 적의 심장을 찌르리라.',
  },
  dog: {
    celestialDomain: '북서방 건(乾)방의 충절 성좌 · 술수호성',
    mythicalOrigin: '주군을 지키기 위해 불속이라도 뛰어드는 충직한 수호신으로, 결코 뚫리지 않는 결계를 친다.',
    awakeningQuote: '주인을 지키는 불멸의 충심으로 어떤 파멸의 일격도 막아내리라.',
  },
  boar: {
    celestialDomain: '북방 해(亥)방의 풍요 성좌 · 해수호성',
    mythicalOrigin: '원초적 대지의 생명력과 무한한 풍요를 품은 신수로, 불멸에 가까운 끈기를 선사한다.',
    awakeningQuote: '대지의 모든 풍요와 원초적 생명력이 용사의 핏줄에 차오르리라.',
  },
};

/**
 * Returns folklore lore for given zodiac sign.
 */
export function getZodiacLore(sign: ZodiacSign): ZodiacFolkloreLore {
  return ZODIAC_FOLKLORE_LORE[sign];
}

/**
 * Returns awakening quote when a constellation is awakened.
 */
export function getZodiacAwakeningQuote(sign: ZodiacSign): string {
  return ZODIAC_FOLKLORE_LORE[sign].awakeningQuote;
}
