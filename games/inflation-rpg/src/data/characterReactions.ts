/**
 * Character personality-driven reactions to story events.
 * Each character has an archetype that determines their tone.
 */

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

const REGION_REACTIONS: Record<Archetype, string[]> = {
  warrior: [
    '좋아, 새로운 전장이다. 검을 갈 시간이야.',
    '강한 적이 있다면 더 좋지.',
    '내 칼끝이 떨린다… 흥분이군.',
  ],
  mage: [
    '이곳의 기운이 범상치 않다… 흥미롭군.',
    '마력의 흐름이 느껴진다.',
    '새로운 지식을 얻을 수 있겠어.',
  ],
  healer: [
    '다치지 않게 조심해야 해.',
    '여기서 약초를 구할 수 있을까?',
    '모두의 안전을 지키겠어.',
  ],
  rogue: [
    '그림자가 많군. 내가 유리하겠어.',
    '빠르게 움직이면 먼저 칠 수 있다.',
    '…소리를 죽여.',
  ],
  tank: [
    '앞장서마. 뒤는 걱정 마라.',
    '어떤 공격이 와도 버틸 수 있다.',
    '방패를 단단히 쥐어야겠군.',
  ],
  hunter: [
    '흔적이 보인다. 추적 개시.',
    '사냥감 냄새가 난다.',
    '활 시위가 팽팽하군. 준비됐다.',
  ],
};

const BOSS_DEFEAT_REACTIONS: Record<Archetype, string[]> = {
  warrior: [
    '좋은 싸움이었다!',
    '이 정도 강적은 오랜만이야.',
    '다음은 더 강한 놈이겠지.',
  ],
  mage: [
    '예상보다 까다로운 상대였군.',
    '이 자의 마력… 연구할 가치가 있다.',
    '승리는 지식의 결과다.',
  ],
  healer: [
    '다행이야, 모두 무사해.',
    '큰 부상 없이 끝나서 다행이야.',
    '다음엔 더 준비를 철저히 해야 해.',
  ],
  rogue: [
    '약점을 찌르면 어떤 놈이든 쓰러진다.',
    '…후. 등에 식은 땀이 흘렀군.',
    '빠르게 끝냈으니 됐어.',
  ],
  tank: [
    '끝까지 버텨냈다. 이게 내 방식이지.',
    '한 발자국도 물러서지 않았어.',
    '단단한 방패가 또 증명됐군.',
  ],
  hunter: [
    '큰 사냥감을 잡았군.',
    '전리품을 확인해봐야겠어.',
    '이것으로 명성이 올라가겠지.',
  ],
};

// C1025: Character reactions on unlocking JP perks
const PERK_UNLOCK_REACTIONS: Record<Archetype, string[]> = {
  warrior: [
    '새로운 힘이 칼날에 깃드는 것이 느껴진다.',
    '더 강한 기술을 손에 넣었군. 시험해볼 상대가 필요하다.',
    '이 힘이라면 다음 전투는 확실한 승리다.',
  ],
  mage: [
    '심오한 힘의 이치를 깨우쳤군.',
    '마력의 구조가 한층 더 정교해졌다.',
    '새로운 비의가 내 영혼을 일깨운다.',
  ],
  healer: [
    '이 힘으로 더 많은 위험을 극복할 수 있겠어.',
    '마음이 한결 든든해지는군.',
    '모두를 지킬 수 있는 새로운 지혜야.',
  ],
  rogue: [
    '흥, 치명적인 무기가 하나 더 생겼군.',
    '그림자 속에서 쓸 패가 늘었어.',
    '상대가 방심할 때 쓰기 딱 좋은 수법이야.',
  ],
  tank: [
    '방벽이 더 두터워진 느낌이다.',
    '어떤 충격도 흡수할 수 있겠군.',
    '더욱 흔들리지 않는 반석이 되겠다.',
  ],
  hunter: [
    '사냥의 감각이 더 예리해졌군.',
    '새로운 사냥 도구를 챙긴 기분이야.',
    '어떤 맹수라도 이제 두렵지 않다.',
  ],
};

// C1025: Character reactions upon surviving via revive_once perk
const PERK_REVIVE_REACTIONS: Record<Archetype, string[]> = {
  warrior: [
    '아직… 끝이 아니다! 칼을 다시 쥐어라!',
    '불굴의 의지는 꺾이지 않는다. 승부는 지금부터다!',
    '한 번 쓰러졌다고 패배한 것이 아니다!',
  ],
  mage: [
    '생과 사의 경계를 넘어… 다시 일어선다!',
    '영혼의 파동이 육신을 다시 꿰매었다.',
    '죽음조차 이 지혜를 덮을 순 없다.',
  ],
  healer: [
    '숨이… 다시 돌아왔어! 포기하지 마!',
    '생명의 불꽃은 아직 꺼지지 않았어.',
    '기적이 일어났어… 다시 싸울 수 있어!',
  ],
  rogue: [
    '큭… 저승 문턱을 살짝 밟고 왔군.',
    '죽은 척하는 것도 전략의 일부지. 이제 반격이다.',
    '두 번 당할 줄 알고? 이번엔 내 차례다.',
  ],
  tank: [
    '크하하! 이 정도 일격으로 날 무너뜨릴 수 없다!',
    '방패는 부서져도 내 뼈는 아직 튼튼하다!',
    '다시 일어섰다. 벽은 무너지지 않는다!',
  ],
  hunter: [
    '사냥꾼이 사냥감에게 죽을 순 없지.',
    '거친 숨을 가다듬고… 다시 겨눈다.',
    '반격의 화살은 더 깊게 박힐 것이다.',
  ],
};

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

export type ReactionEventType = 'region_enter' | 'boss_defeat' | 'perk_unlock' | 'perk_revive';

export function getCharacterReaction(
  characterId: string,
  storyType: ReactionEventType,
  storyId: string,
): string | null {
  const archetype = CHARACTER_ARCHETYPES[characterId];
  if (!archetype) return null;

  let pool: string[];
  switch (storyType) {
    case 'region_enter':
      pool = REGION_REACTIONS[archetype];
      break;
    case 'boss_defeat':
      pool = BOSS_DEFEAT_REACTIONS[archetype];
      break;
    case 'perk_unlock':
      pool = PERK_UNLOCK_REACTIONS[archetype];
      break;
    case 'perk_revive':
      pool = PERK_REVIVE_REACTIONS[archetype];
      break;
    default:
      return null;
  }

  const seed = `${characterId}-${storyId}`;
  const idx = Math.floor(seededRandom(seed) * pool.length);
  return pool[idx] ?? null;
}

/** C1025: Convenience helper for perk unlock dialogue */
export function getPerkUnlockReaction(characterId: string, perkId: string): string | null {
  return getCharacterReaction(characterId, 'perk_unlock', perkId);
}

/** C1025: Convenience helper for perk revive combat quote */
export function getPerkReviveReaction(characterId: string, tick = 0): string | null {
  return getCharacterReaction(characterId, 'perk_revive', `revive-${tick}`);
}
