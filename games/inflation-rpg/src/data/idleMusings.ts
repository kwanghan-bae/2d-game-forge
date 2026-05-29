/**
 * Character idle musings — shown randomly when player is on overworld/main menu.
 * Each character has 3 short quips that reflect personality.
 */

const IDLE_MUSINGS: Record<string, [string, string, string]> = {
  hwarang: ['검 닦을 시간이다.', '새벽 수련을 놓쳤구나.', '무예를 갈고닦아야지.'],
  mudang: ['산신령이 부르신다.', '오늘 점괘가 길하다.', '굿을 올릴 때가 됐어.'],
  choeui: ['약재가 떨어져 간다.', '환자가 기다리고 있어.', '침 놓을 곳이 보이는군.'],
  geomgaek: ['좋은 상대가 그립다.', '검의 무게가 다르게 느껴진다.', '바람이 시원하군.'],
  tiger_hunter: ['호랑이 발자국이 보인다.', '덫을 점검해야겠어.', '산이 고요하구나.'],
  dosa: ['도를 깨우치면 뭐가 달라질까.', '구름이 좋은 모양이다.', '하산할 때가 됐나.'],
  yacha: ['이 힘을 어디에 쓸까.', '인간들이 두려워하겠지.', '달빛이 강하구나.'],
  gungsu: ['화살 재고를 확인해야지.', '바람의 방향이 바뀌었다.', '멀리 보이는 과녁…'],
  uinyeo: ['약초를 더 캐야겠어.', '아픈 이가 있을지도.', '조용히 쉬어야지.'],
  jangsu: ['병사들의 사기가 중요하다.', '전략을 다시 짜볼까.', '아직 전쟁은 끝나지 않았다.'],
  seungbyeong: ['부처님 말씀을 되새기자.', '절에 돌아가고 싶구나.', '중생을 구해야지.'],
  geosa: ['별자리가 움직였다.', '내일의 운세는…', '역술서를 펼쳐봐야겠군.'],
  cheongwan: ['보고서를 써야 하는데.', '법전을 다시 읽어볼까.', '민원이 쌓여있겠지.'],
  yongnyeo: ['파도 소리가 그립다.', '용궁은 평화로울까.', '조개를 주워볼까.'],
  gwisin: ['왜 아직 여기 있지…', '한이 풀리려면 멀었나.', '차가운 바람이 분다.'],
  seonin: ['구름 위에서 차 한잔.', '선계의 복숭아가 익었을까.', '속세가 시끄럽구나.'],
};

export function getIdleMusing(charId: string): string | null {
  const musings = IDLE_MUSINGS[charId];
  if (!musings) return null;
  return musings[Math.floor(Math.random() * musings.length)]!;
}
