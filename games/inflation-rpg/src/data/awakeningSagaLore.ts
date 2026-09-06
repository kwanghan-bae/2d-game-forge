/**
 * awakeningSagaLore.ts — C1078: Nine-Star Celestial Awakening Hymns & Saga Lore.
 *
 * Provides epic Taoist hymns, titles, and chronicle epitaphs for the 9-Star
 * Celestial Realm (구속천계경지), etched into the hero's eternal Saga Book.
 */

export interface AwakeningSagaTierLore {
  tier: number;
  taoistTitle: string;
  hanjaTitle: string;
  hymn: string;
  sagaEpitaph: string;
  breakthroughQuote: string;
}

export const AWAKENING_SAGA_LORE: Record<number, AwakeningSagaTierLore> = {
  1: {
    tier: 1,
    taoistTitle: '개광자 (開光者)',
    hanjaTitle: '開光者',
    hymn: '우주의 첫 번째 새벽이 눈동자에 맺히니, 닫혀 있던 영혼의 혈맥이 활짝 열리도다.',
    sagaEpitaph: '필멸의 육신을 딛고 우주의 첫 성광을 체내로 받아들여 개광의 문을 열었다.',
    breakthroughQuote: '아득한 밤하늘의 성광이 단전에 스며들어 육신의 한계가 걷히기 시작한다!',
  },
  2: {
    tier: 2,
    taoistTitle: '벽곡선 (辟穀仙)',
    hanjaTitle: '辟穀仙',
    hymn: '세속의 음식을 끊고 오직 맑은 별빛의 진기로만 숨 쉬니, 피부는 강철이요 뼈는 옥이로다.',
    sagaEpitaph: '세속의 탁기를 모두 정화하고 순수한 성광의 기운만으로 육신을 지탱하였다.',
    breakthroughQuote: '오장육부의 탁기가 빠져나가고 맑고 단단한 금강의 결계가 온몸을 감싼다!',
  },
  3: {
    tier: 3,
    taoistTitle: '통현진인 (通玄眞人)',
    hanjaTitle: '通玄眞人',
    hymn: '원소의 상성을 꿰뚫고 삼라만상의 현묘한 이치를 깨우치니, 칼끝에서 사계가 춤추노라.',
    sagaEpitaph: '원소의 벽을 허물고 만물의 이치에 통달하여 자연의 흐름을 지배하였다.',
    breakthroughQuote: '불과 물, 번개와 어둠이 내 의지대로 춤추며 상성의 극의를 드러낸다!',
  },
  4: {
    tier: 4,
    taoistTitle: '귀진도제 (歸眞道帝)',
    hanjaTitle: '歸眞道帝',
    hymn: '모든 번뇌와 잡념을 깨부수고 근원의 파괴력으로 회귀하니, 일격에 산천이 무너지도다.',
    sagaEpitaph: '화려한 기술을 벗어나 오직 순수하고 절대적인 파괴의 근원에 도달하였다.',
    breakthroughQuote: '잡념이 사라지고 오직 파멸을 벼려내는 순수한 일격의 진리가 손끝에 맺힌다!',
  },
  5: {
    tier: 5,
    taoistTitle: '금단선존 (金丹仙尊)',
    hanjaTitle: '金丹仙尊',
    hymn: '단전 한가운데 불멸의 황금 성핵이 영원히 빛나니, 어떤 흉탄도 나를 꺾지 못하리라.',
    sagaEpitaph: '불멸의 금단을 맺음으로써 생명과 방어의 궁극적인 영원성을 확립하였다.',
    breakthroughQuote: '가슴속에서 타오르는 황금빛 금단이 영원한 생명의 샘을 뿜어낸다!',
  },
  6: {
    tier: 6,
    taoistTitle: '영적신군 (靈寂神君)',
    hanjaTitle: '靈寂神君',
    hymn: '시공간의 요동이 완전한 고요 속에 잠기니, 찰나의 순간에 만 번의 섬광을 벼려내노라.',
    sagaEpitaph: '시공간의 번잡함을 가라앉히고 번개보다 빠른 신속의 적멸 경지에 들었다.',
    breakthroughQuote: '천지가 고요해지며 눈앞의 모든 시간의 흐름이 멈춘 듯 느려진다!',
  },
  7: {
    tier: 7,
    taoistTitle: '원영태상 (元嬰太上)',
    hanjaTitle: '元嬰太上',
    hymn: '육신의 허물을 벗고 불멸의 성광 영혼이 탄생하니, 일격마다 은하수가 갈라지도다.',
    sagaEpitaph: '불멸의 성광 영혼인 원영을 잉태하여 신선의 경지를 넘어 반신의 위엄을 드러냈다.',
    breakthroughQuote: '내 안에서 또 하나의 불멸의 영혼이 눈을 뜨며 폭발적인 성광이 분출한다!',
  },
  8: {
    tier: 8,
    taoistTitle: '화신천제 (化神天帝)',
    hanjaTitle: '化神天帝',
    hymn: '삼라만상과 자연 그 자체가 되어 호흡하니, 천지의 모든 기운이 나의 수호자가 되도다.',
    sagaEpitaph: '자연과 우주의 질서 그 자체가 되어 어떠한 파멸적인 재앙도 무위로 돌렸다.',
    breakthroughQuote: '온 우주가 나의 숨결과 공명하며, 세상의 모든 원소가 나를 보좌한다!',
  },
  9: {
    tier: 9,
    taoistTitle: '천외천 무극신선 (天外天 無極神仙)',
    hanjaTitle: '天外天 無極神仙',
    hymn: '하늘 위의 하늘, 무극의 정점에 도달하여 필멸의 윤회를 꺾고 우주의 법(法)이 되었노라!',
    sagaEpitaph: '필멸자의 한계를 완전히 초월하여 하늘 위의 하늘, 천외천의 무극신선으로 영원히 전설에 새겨졌다.',
    breakthroughQuote: '모든 윤회의 사슬이 끊어지고, 내가 곧 우주이자 법칙 그 자체가 되었도다!',
  },
};

/**
 * Returns hymn for given tier.
 */
export function getAwakeningTitleHymn(tier: number): string {
  return AWAKENING_SAGA_LORE[tier]?.hymn ?? '우주의 성광이 영혼 주위를 맴돕니다.';
}

/**
 * Returns saga chronicle epitaph for given tier.
 */
export function getSagaEpitaph(tier: number): string {
  return AWAKENING_SAGA_LORE[tier]?.sagaEpitaph ?? '아직 초월의 경지에 이르지 못하였다.';
}

/**
 * Returns breakthrough quote for given tier.
 */
export function getBreakthroughAnnouncement(tier: number): string {
  return AWAKENING_SAGA_LORE[tier]?.breakthroughQuote ?? '각성의 기운이 솟구칩니다.';
}
