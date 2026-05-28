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

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

export function getCharacterReaction(
  characterId: string,
  storyType: 'region_enter' | 'boss_defeat',
  storyId: string,
): string | null {
  const archetype = CHARACTER_ARCHETYPES[characterId];
  if (!archetype) return null;

  const pool = storyType === 'region_enter'
    ? REGION_REACTIONS[archetype]
    : BOSS_DEFEAT_REACTIONS[archetype];

  const seed = `${characterId}-${storyId}`;
  const idx = Math.floor(seededRandom(seed) * pool.length);
  return pool[idx] ?? null;
}
