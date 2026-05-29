/** Boss last words when defeated — shown briefly in battle log */
export const BOSS_LAST_WORDS: Record<string, string[]> = {
  base_boss: [
    '이것이… 시작의 끝이란 말인가…',
    '더 강한 자가 기다리고 있다… 잊지 마라…',
  ],
  sea_boss: [
    '바다의 분노는… 잠들지 않는다…',
    '파도처럼… 다시 일어나리라…',
  ],
  volcano_boss: [
    '용암은… 식지 않아… 언젠가… 분출한다…',
    '불꽃의 의지는… 재가 되어도… 남는다…',
  ],
  underworld_boss: [
    '죽음을 이긴다고? 어리석은… 모든 것은 여기로 돌아온다…',
    '명계의 문은… 항상 열려 있다…',
  ],
  heaven_boss: [
    '신의 뜻을… 거스르다니… 대가가 따를 것이다…',
    '빛이 지면… 더 깊은 어둠이…',
  ],
  chaos_boss: [
    '혼돈은… 끝이 아니라… 새로운 시작이다…',
    '경계가 무너진다… 모든 것이… 하나로…',
  ],
};

export function getBossLastWords(bossId: string): string | null {
  const pool = BOSS_LAST_WORDS[bossId];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
