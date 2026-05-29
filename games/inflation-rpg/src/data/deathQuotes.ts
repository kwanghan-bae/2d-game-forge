/**
 * Character-specific death/farewell quotes shown on hero defeat.
 * Each character has 2 quotes; one is randomly selected.
 */
export const DEATH_QUOTES: Record<string, [string, string]> = {
  hwarang:      ['화랑의 길, 여기서 끝인가…', '다음엔… 더 강해져서 돌아온다.'],
  mudang:       ['영혼이 부르고 있어…', '이 인연, 아직 끊기지 않았다.'],
  choeui:       ['금강도 무너지는 법이지.', '몸은 쓰러져도 뜻은 꺾이지 않는다.'],
  geomgaek:     ['검이 부러졌군.', '패배도 검도의 일부.'],
  tiger_hunter: ['이번 사냥감은… 나였나.', '숲이 나를 삼킨다.'],
  dosa:         ['도의 끝에 닿지 못했구나.', '이 기운, 다음 생에 이어가리.'],
  yacha:        ['잡히지 않는 것이 야차인데…', '그림자도 지는 법이 있군.'],
  gungsu:       ['마지막 화살도 빗나갔다.', '바람이… 불어준다면…'],
  uinyeo:       ['모두를 치료했지만, 나 자신은…', '약초 향이 멀어져간다.'],
  jangsu:       ['진을 지키지 못했다…', '장수도 쓰러지는 날이 있는 법.'],
  seungbyeong:  ['나무아미타불…', '이 몸 부처에게 반납합니다.'],
  geosa:        ['바위도 세월에 깎이는 법.', '무거운 눈꺼풀이… 내려온다.'],
  cheongwan:    ['별이 꺼져간다.', '다음 점괘에서… 다시 만나자.'],
  yongnyeo:     ['용의 피도 식어가는군.', '바다가 부르고 있어.'],
  gwisin:       ['이미 죽은 몸인데… 또 죽다니.', '저승길은 익숙하지.'],
  seonin:       ['구름 위로 돌아가마.', '산의 기운이 다했구나.'],
};

export function getDeathQuote(characterId: string): string {
  const quotes = DEATH_QUOTES[characterId];
  if (!quotes) return '…';
  return quotes[Math.random() < 0.5 ? 0 : 1];
}
