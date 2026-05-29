/** 캐릭터별 보스전 특수 대사. 보스 등장 시 표시. */
export const BOSS_BATTLE_QUOTES: Record<string, readonly string[]> = {
  hwarang: ['이것이 충의 시험이다!', '강적이여, 한 판 겨루자!'],
  mudang: ['악기가 강하다... 영혼이 흔들린다.', '두려워하지 마라, 이것도 운명.'],
  choeui: ['이 갑옷의 진가를 보여줄 때다.', '쇳덩이와 쇳덩이의 대결!'],
  geomgaek: ['좋은 상대를 만났군.', '이 검의 끝을 보여주마.'],
  tiger_hunter: ['대어가 걸렸다.', '이번 사냥은 목숨을 건다.'],
  dosa: ['이 주문은 아꼈던 것이다!', '하늘도 노했다!'],
  yacha: ['이 그림자, 뚫을 수 있겠나?', '급소를 노린다.'],
  gungsu: ['한 발의 무게가 다르다.', '빗나가면 죽는다.'],
  uinyeo: ['이 녀석은... 위험해요.', '치유로는 부족할지도...'],
  jangsu: ['전군! 총공격!', '이 전투가 전쟁의 분수령이다!'],
  seungbyeong: ['모든 기를 주먹에!', '불퇴전!'],
  geosa: ['최종 방어선이다!', '이 성벽은 무너지지 않는다!'],
  cheongwan: ['별이 경고한다... 쉽지 않다.', '운명의 한 수!'],
  yongnyeo: ['진정한 용이 누군지 보여주마!', '화염의 세례를 받아라!'],
  gwisin: ['강한 원한이 느껴진다...', '이 한을 너에게 쏟겠다!'],
  seonin: ['이것은 수행의 마지막 관문.', '고요함 속에 폭풍이 있다.'],
};

export function getBossBattleQuote(characterId: string): string | null {
  const pool = BOSS_BATTLE_QUOTES[characterId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
