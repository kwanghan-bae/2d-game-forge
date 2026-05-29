/** Character quotes on dungeon floor clear */
export const FLOOR_CLEAR_QUOTES: Record<string, string[]> = {
  hwarang: ['한 층 더 올랐다. 갈 길이 멀다.', '칼을 쥔 이상 멈추지 않는다.'],
  mudang: ['영혼들이 인도한다… 더 깊이.', '이 정도론 부족해.'],
  choeui: ['수행은 계속된다.', '금강의 의지로 나아간다.'],
  geomgaek: ['칼날에 피가 마르기 전에.', '더 강한 적을 원한다.'],
  tiger_hunter: ['호랑이 냄새가 짙어진다.', '사냥감은 아직 남았다.'],
  dosa: ['도력이 충만하다.', '다음 층의 기운이 느껴진다.'],
  yacha: ['그림자처럼 나아간다.', '아직 빠르다.'],
  gungsu: ['과녁은 아직 남아있다.', '바람의 방향이 좋다.'],
  uinyeo: ['치유의 손길이 필요한 곳이 더 있다.', '약초 향이 진해진다.'],
  jangsu: ['철벽의 방어는 계속된다.', '전쟁터는 아직 끝나지 않았다.'],
  seungbyeong: ['부처님의 가호 아래.', '인과응보의 길을 간다.'],
  geosa: ['학문의 길에 끝은 없다.', '붓을 놓지 않는다.'],
  cheongwan: ['관의 눈은 모든 것을 본다.', '법도는 지켜져야 한다.'],
  yongnyeo: ['용의 핏줄은 잠들지 않는다.', '더 깊은 곳을 향해.'],
  gwisin: ['원한은 아직 풀리지 않았다.', '저승길은 멀다.'],
  seonin: ['선계의 문이 열린다.', '깨달음은 가까이.'],
};

export function getFloorClearQuote(characterId: string): string | null {
  const pool = FLOOR_CLEAR_QUOTES[characterId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
