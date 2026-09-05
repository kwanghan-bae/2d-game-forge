/**
 * elementalFlavor.ts — C1042: Elemental Affinity Exclamations & Monster Lore.
 *
 * Provides archetype-driven spoken reaction quotes during elemental combat
 * and monster lore hints detailing elemental vulnerabilities.
 */

import type { AffinityRelation } from '../systems/elementalSystem';

type Archetype = 'warrior' | 'mage' | 'healer' | 'rogue' | 'tank' | 'hunter';

const CHARACTER_ARCHETYPES: Record<string, Archetype> = {
  hwarang: 'warrior',
  mudang: 'mage',
  choeui: 'tank',
  geomgaek: 'rogue',
  tiger_hunter: 'hunter',
  dosa: 'mage',
  yacha: 'rogue',
  gungsu: 'hunter',
  uinyeo: 'healer',
  jangsu: 'tank',
  seungbyeong: 'warrior',
  yongnyeo: 'mage',
  seonin: 'mage',
  gwichuk: 'rogue',
  pyeonmin: 'warrior',
  nongbu: 'tank',
};

export const ELEMENTAL_EXCLAMATIONS: Record<
  Archetype,
  Record<'weakness' | 'resistance' | 'dark_clash', string>
> = {
  warrior: {
    weakness: '놈의 약점을 찔렀다! 지금이다, 베어라!',
    resistance: '칼날이 튕겨 나갔어… 역상성인가?!',
    dark_clash: '어둠의 기운과 격돌한다! 한 치도 물러서지 마라!',
  },
  mage: {
    weakness: '원소의 상극 법칙대로군요! 치명타입니다!',
    resistance: '마력이 흡수되고 있습니다… 다른 속성 무기가 필요해요!',
    dark_clash: '빛과 어둠의 파동이 서로를 찢고 있습니다!',
  },
  rogue: {
    weakness: '급소가 훤히 보이는군. 일격에 끝내주마.',
    resistance: '쳇, 껍질이 너무 두꺼워. 통하지 않는다!',
    dark_clash: '서로를 베는 난타전이야. 먼저 베는 쪽이 이긴다.',
  },
  tank: {
    weakness: '빈틈을 발견했다! 전열을 유지하며 밀어붙여라!',
    resistance: '충격이 크지 않다만, 대미지가 반감되고 있소!',
    dark_clash: '음침한 저주로다! 방패를 굳게 세워라!',
  },
  hunter: {
    weakness: '약점 정중앙에 화살이 꽂혔다!',
    resistance: '화살이 빗맞았다… 속성을 바꿔야겠어.',
    dark_clash: '그림자가 사냥감을 감싸고 있어. 조심해서 당겨라!',
  },
  healer: {
    weakness: '정령들이 도와주고 있어요! 지금이에요!',
    resistance: '공격이 잘 안 통하고 있어요, 다치지 않게 조심하세요!',
    dark_clash: '불길한 사기가 감돌고 있어요. 신성한 가호로 지켜드릴게요!',
  },
};

export const MONSTER_WEAKNESS_HINTS: Record<string, string> = {
  fire_titan: '불타는 심장을 가졌으나, 차가운 수(水)기운 앞에서는 화염이 사그라집니다.',
  flame_golem: '작열하는 마그마 코어는 냉혹한 수(水) 속성 일격에 산산조각 납니다.',
  dragon_lord: '하늘을 가르는 번개의 군주. 허나 대지의 맹화(火) 앞에서는 날개가 꺾입니다.',
  thunder_bird: '전율하는 뇌조. 번개를 집어삼키는 뜨거운 불길(火)에 깃털이 타버립니다.',
  sea_serpent: '깊은 심해의 지배자. 거센 벼락(雷)이 물길을 타고 온몸을 마비시킵니다.',
  frost_giant: '얼어붙은 거인. 찌릿한 뇌격(雷)에 빙벽이 부서져 내립니다.',
  dark_lord: '심연의 지배자. 모든 원소와 치명적인 상호 격돌(暗)을 일으킵니다.',
};

/**
 * Gets the in-character exclamation for an elemental combat matchup.
 */
export function getAffinityExclamation(
  characterId: string,
  relation: AffinityRelation,
): string | null {
  if (relation === 'neutral') return null;
  const archetype = CHARACTER_ARCHETYPES[characterId] ?? 'warrior';
  return ELEMENTAL_EXCLAMATIONS[archetype][relation] ?? null;
}

/**
 * Gets monster lore/weakness hint text by enemy ID.
 */
export function getMonsterWeaknessHint(enemyId: string): string | null {
  return MONSTER_WEAKNESS_HINTS[enemyId] ?? null;
}
