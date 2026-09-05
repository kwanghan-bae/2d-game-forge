/**
 * blacksmithFlavor.ts — C1036: Blacksmith NPC & Character Reforging Reactions.
 *
 * Provides immersive in-world dialogue for equipment enhancement,
 * dismantling, and personality-driven character reactions.
 */

import type { ReforgeOutcome } from '../systems/reforgeSystem';

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

export const BLACKSMITH_DIALOGUES = {
  welcome: [
    '불꽃이 가장 뜨거울 때 쇠를 두드려야 하는 법이지.',
    '어떤 무구를 벼리러 왔는가?',
    '장비의 숨겨진 힘을 이끌어내 주마.',
  ],
  success: [
    '쇠붙이가 제 빛을 찾았군! 훌륭한 날이야.',
    '보아라, 날카로운 기운이 서려 있지 않나!',
    '이 정도면 마물 놈들의 뼈도 단숨에 가르겠어.',
  ],
  great_success: [
    '천지개벽이로다! 전설의 불꽃이 장비에 깃들었다!',
    '오오! 망치가 춤을 추더니 단숨에 두 단계나 벼려졌군!',
    '이것이야말로 장인의 필생의 역작이다!',
  ],
  failure: [
    '큭, 불꽃의 기운이 엇나갔군. 허나 칼날은 상하지 않았으니 안심하게.',
    '숨을 고르고 다시 두드리면 될 일이야. 쇠는 부러지지 않았다네.',
    '망치질이 빗나갔지만 장비는 온전하이. 다음엔 분명 깃들 테지.',
  ],
  max_level: [
    '더 이상 두드릴 필요가 없네. 이미 신화의 경지에 닿은 무구야!',
    '내 평생 이런 명검/명갑을 완성하다니 여한이 없네.',
  ],
  dismantle: [
    '쓸모를 다한 쇠에서 순수한 강화석과 금전을 추출해냈네.',
    '재료가 모여 더 강한 무구의 밑거름이 될 걸세.',
  ],
};

export const CHARACTER_REFORGE_REACTIONS: Record<Archetype, Record<ReforgeOutcome, string>> = {
  warrior: {
    success: '손에 착 감기는군. 베는 맛이 다르겠어!',
    great_success: '이 전율… 검 스스로 울고 있다! 당장 베러 가자!',
    failure: '괜찮다. 수련도 실패를 딛고 강해지는 법이지.',
    max_level: '천하무적의 무구다. 적들이여, 올 테면 와라!',
  },
  mage: {
    success: '무구의 마력 회로가 한층 선명해졌군요.',
    great_success: '경이롭습니다! 마력의 파동이 공기를 뒤흔들고 있어요!',
    failure: '원소의 조화가 잠시 흐트러졌을 뿐입니다. 안전하군요.',
    max_level: '신계의 유물에 버금가는 순수한 마력입니다…!',
  },
  healer: {
    success: '이 무구가 우리를 더 잘 지켜주겠지요.',
    great_success: '신성한 가호가 깃든 것 같아요. 마음이 놓입니다!',
    failure: '다치지 않고 무사한 것만으로도 감사한 일이에요.',
    max_level: '모든 액운을 막아줄 성물이 완성되었어요.',
  },
  rogue: {
    success: '가볍고도 예리해. 그림자 속에서 급소를 찌르기 딱 좋아.',
    great_success: '크큭… 바람조차 가를 날이다. 아무도 눈치채지 못하겠어.',
    failure: '쳇, 빗나갔나. 그래도 칼이 부러지진 않았으니 됐어.',
    max_level: '이 칼날에 스치기만 해도 끝장이겠군.',
  },
  tank: {
    success: '묵직하군! 어떤 맹공도 막아낼 수 있겠다.',
    great_success: '태산처럼 단단하구나! 날 뚫을 수 있는 놈은 없다!',
    failure: '허허, 대장장이 양반. 방패는 여전히 튼튼하니 걱정 마시오.',
    max_level: '금강불괴의 성벽이 완성되었도다!',
  },
  hunter: {
    success: '시위의 탄력이 배는 좋아졌군. 백발백중이다.',
    great_success: '이 활은 바람의 결을 읽는다! 어떤 사냥감도 놓치지 않아!',
    failure: '바람이 잠시 멈췄을 뿐이야. 다음 한 발을 노리자.',
    max_level: '신궁의 경지… 화살 하나로 산도 뚫겠어.',
  },
};

/**
 * Returns a random blacksmith dialogue for given event outcome.
 */
export function getBlacksmithDialogue(
  outcome: ReforgeOutcome | 'welcome' | 'dismantle',
  index: number = 0,
): string {
  const lines = BLACKSMITH_DIALOGUES[outcome] ?? BLACKSMITH_DIALOGUES.welcome;
  const safeIndex = Math.abs(index) % lines.length;
  return lines[safeIndex];
}

/**
 * Returns character's in-character spoken reaction to reforge outcome.
 */
export function getCharacterReforgeReaction(
  characterId: string,
  outcome: ReforgeOutcome,
): string {
  const archetype = CHARACTER_ARCHETYPES[characterId] ?? 'warrior';
  const reactions = CHARACTER_REFORGE_REACTIONS[archetype];
  return reactions[outcome] ?? reactions.success;
}
