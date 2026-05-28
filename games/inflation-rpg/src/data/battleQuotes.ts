/** 캐릭터별 전투 개시 대사. 던전 진입 시 랜덤 1개 표시. */
export const BATTLE_QUOTES: Record<string, readonly string[]> = {
  hwarang: ['나라를 위해!', '검 위에 충절을 새긴다!', '물러서지 않겠다!'],
  mudang: ['영혼이여, 인도하라.', '비가 올 징조다...', '춤으로 답하리라.'],
  choeui: ['이 갑옷은 뚫리지 않는다.', '끝까지 버텨보겠다.', '금강불괴!'],
  geomgaek: ['한 수만 더.', '칼끝에 답이 있다.', '일섬!'],
  tiger_hunter: ['표적 확인.', '바람을 읽어라.', '한 발이면 족하다.'],
  dosa: ['하늘의 힘을 빌린다.', '주문 완성!', '불꽃이여, 타올라!'],
  yacha: ['그림자 속에서...', '아무도 눈치채지 못할 거야.', '스쳐 지나간다.'],
  gungsu: ['과녁은 하나.', '숨을 멈추고...', '연발!'],
  uinyeo: ['다치지 마세요.', '치유의 손길을...', '끝까지 지켜드릴게요.'],
  jangsu: ['진격!', '대열을 갖춰라!', '돌격 준비!'],
  seungbyeong: ['호오!', '주먹에 기를 모은다.', '참을 인, 세 번이면 족하다.'],
  geosa: ['요새화 완료.', '이곳을 내어줄 수 없다.', '벽처럼 서리라.'],
  cheongwan: ['운이 따르는군.', '별이 알려준다.', '행운은 필연이다.'],
  yongnyeo: ['용의 피가 끓는다!', '불꽃을 뿜어라!', '날개를 펼쳐라!'],
  gwisin: ['원한... 풀어주마...', '저승에서 왔다.', '무서운 건 나다.'],
  seonin: ['명상으로 답을 찾는다.', '자연의 흐름을 따라.', '천천히, 확실하게.'],
};

export function getBattleQuote(characterId: string): string | null {
  const pool = BATTLE_QUOTES[characterId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
