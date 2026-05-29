/**
 * Character-specific victory quotes — shown on run completion (all 5 bosses defeated).
 */

const VICTORY_QUOTES: Record<string, [string, string]> = {
  hwarang: ['이 땅에 평화를 되찾았다!', '화랑의 길은 끝나지 않는다.'],
  mudang: ['신령님의 뜻이 이루어졌구나.', '다음 제례를 준비해야지.'],
  choeui: ['아직 치료할 이가 남았다.', '화타도 미소 짓겠지.'],
  geomgaek: ['내 검은 녹슬지 않는다.', '강한 적이 그리울 것이다.'],
  tiger_hunter: ['호랑이도 이제 편히 쉬라.', '산으로 돌아갈 시간이다.'],
  dosa: ['도를 깨우친 자의 여정은 끝이 없다.', '하늘이 내린 시련이었구나.'],
  yacha: ['이 힘, 선을 위해 쓰리라.', '어둠 속에서도 빛은 존재한다.'],
  gungsu: ['백발백중, 빈말이 아니었지.', '화살이 부족해지기 전에 끝냈군.'],
  uinyeo: ['모두의 상처를 치유할 수 있다면.', '약초를 더 캐러 가야겠어.'],
  jangsu: ['장수의 이름에 부끄럽지 않은 승리다.', '병사들에게 돌아가자.'],
  seungbyeong: ['부처님의 가호였다.', '절에 공양을 올려야겠구나.'],
  geosa: ['점괘대로 흘러갔군.', '다음 흉사도 막아야지.'],
  cheongwan: ['국법이 바로 섰다.', '보고서를 올려야 하는데…'],
  yongnyeo: ['용궁에 좋은 소식을 전하리.', '파도가 나를 부르고 있어.'],
  gwisin: ['한이 풀렸다…', '이승에 미련은 없다.'],
  seonin: ['선계의 평화가 돌아왔구나.', '구름 위에서 차 한 잔 해야지.'],
};

export function getVictoryQuote(charId: string): string | null {
  const quotes = VICTORY_QUOTES[charId];
  if (!quotes) return null;
  return quotes[Math.floor(Math.random() * quotes.length)]!;
}
