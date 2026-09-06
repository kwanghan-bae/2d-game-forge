/**
 * mythicAwakeningLore.ts — C1096: Primordial Divinity Awakening Lore & Nebula Set Hymns.
 *
 * Chronicles the liberation of primordial divinity sleeping within mythic armaments,
 * star-awakening mantras, and the 15-Star Transcendent Cosmic Epic.
 */

export const MYTHIC_STAR_MANTRAS: Record<number, string> = {
  1: '무구의 잠든 혈맥에 별빛이 스며들어, 은은한 푸른 성운의 빛무리가 피어오른다.',
  2: '원소의 상성을 꿰뚫는 성운의 칼날이 예리해지며, 적의 어떠한 원소 방벽도 무력화한다.',
  3: '겁화와 뇌정의 파동이 장비 표면을 휘감고, 착용자의 숨결마다 천둥이 고동친다.',
  4: '필멸의 쇠붙이가 신성한 우주 신금(神金)으로 승화되어, 스스로 우주의 섭리를 속삭인다.',
  5: '태초의 신성이 완전히 눈을 떠, 장비 그 자체가 하나의 거대한 은하계(銀河界)로 화하였도다!',
};

export const MYTHIC_SET_HYMNS: Record<number, string> = {
  2: '둘 이상의 성운이 서로 공명하여, 상성을 뛰어넘는 원소 관통의 빛을 뿜어내리라.',
  5: '다섯 개의 별빛이 단전에 모여 치명적인 일격을 벼리고, 파멸을 튕겨내는 금강의 결계를 세우노라.',
  10: '열 개의 성운이 은하수를 이루니, 영웅의 기백이 천지를 뒤흔들고 공격과 생명이 크게 도약하도다.',
  15: '열다섯 개의 성운이 완전한 일체를 이루어 태초의 혼돈을 잠재우고, 시공간의 침식마저 소멸시키는 영원불멸의 신화가 탄생하였도다!',
};

/**
 * Returns star awakening chronicle mantra.
 */
export function getMythicStarMantra(stars: number): string {
  return MYTHIC_STAR_MANTRAS[stars] ?? '신화 장비의 기운이 고요히 숨을 쉽니다.';
}

/**
 * Returns set resonance hymn for current total stars.
 */
export function getMythicSetHymn(totalStars: number): string {
  if (totalStars >= 15) return MYTHIC_SET_HYMNS[15];
  if (totalStars >= 10) return MYTHIC_SET_HYMNS[10];
  if (totalStars >= 5) return MYTHIC_SET_HYMNS[5];
  if (totalStars >= 2) return MYTHIC_SET_HYMNS[2];
  return '아직 성운의 공명이 잠들어 있습니다.';
}

/**
 * Formats chronicle inscription for Hall of Sagas.
 */
export function formatMythicSagaInscription(totalStars: number): string {
  if (totalStars >= 15) {
    return '15성 완전무결 성운 초월을 달성하여 혼돈의 침식을 무효화하고 우주의 신화로 등극하였다.';
  }
  return `신화 장비 성운 ${totalStars}성을 각성하여 우주의 공명을 이끌어냈다.`;
}
