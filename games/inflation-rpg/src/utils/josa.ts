/**
 * 한국어 조사 (particle) helper.
 *
 * 받침 (jongseong) 유무를 자동 판정해 명사 뒤에 알맞은 조사를 붙인다.
 *
 * Cycle 4 A2 — 정찰 보고서의 `폭풍와 결투했다` 류 받침 불일치 해소.
 *
 * 받침 판정 룰:
 *   - 한글 음절: `(unicode - 0xAC00) % 28 !== 0` 이면 받침 있음
 *   - `으로/로` 만 ㄹ 받침 (jongseong index 8) 을 예외로 '로' 사용
 *   - 비한글 (영문/숫자/한자 등): 모음으로 끝나면 받침 없음, 그 외 받침 있음
 *     (간단 휴리스틱 — RPG 컨텍스트의 영문 NPC 이름 fallback 용)
 *
 * @example
 *   josa('폭풍', '과와')   // '폭풍과'
 *   josa('바람', '과와')   // '바람과' (ㅁ 받침)
 *   josa('나비', '이가')   // '나비가' (받침 없음)
 *   josa('서울', '으로로') // '서울로' (ㄹ 받침 예외)
 *   josa('Bob',  '이가')   // 'Bob이'  (영문 자음 끝)
 */
export type JosaPair = '이가' | '을를' | '과와' | '은는' | '으로로';

/** 한 음절의 받침 index. 한글이 아니면 null. */
function jongseongIndex(ch: string): number | null {
  if (ch.length === 0) return null;
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28;
}

/** 비한글 한 글자가 모음인지 (단순 휴리스틱). */
function isEnglishVowel(ch: string): boolean {
  return /[aeiouAEIOU]/.test(ch);
}

/**
 * word 의 마지막 의미있는 글자가 받침을 가지는지 판정.
 * - 한글이면 jongseong != 0
 * - 영문이면 자음 끝 (받침 취급)
 * - 숫자/기타: 받침 없음 fallback
 *
 * @returns { jong: number | null, hasBatchim: boolean }
 *   jong: 한글일 때 받침 index, 비한글이면 null
 *   hasBatchim: 받침 있음 / 없음 (boolean)
 */
function analyzeLastChar(word: string): { jong: number | null; hasBatchim: boolean } {
  if (word.length === 0) return { jong: null, hasBatchim: false };
  const last = word.charAt(word.length - 1);
  const jong = jongseongIndex(last);
  if (jong !== null) {
    return { jong, hasBatchim: jong !== 0 };
  }
  // 비한글: 영문 자음 끝이면 받침 있음
  if (/[a-zA-Z]/.test(last)) {
    return { jong: null, hasBatchim: !isEnglishVowel(last) };
  }
  // 숫자/한자/기호: 받침 없음으로 fallback
  return { jong: null, hasBatchim: false };
}

/**
 * 명사 + 알맞은 조사 반환.
 *
 * @param word 명사
 * @param type 조사 pair ('이가', '을를', '과와', '은는', '으로로')
 * @returns `word + particle` (받침 유무에 따라 자동 선택)
 */
export function josa(word: string, type: JosaPair): string {
  const { jong, hasBatchim } = analyzeLastChar(word);

  // '으로/로' 는 ㄹ 받침 예외: ㄹ (jongseong index 8) → '로'
  if (type === '으로로') {
    if (jong === 8) return `${word}로`;
    return hasBatchim ? `${word}으로` : `${word}로`;
  }

  // 나머지 4 pair: 받침 있으면 첫 글자, 없으면 두 번째.
  // type 문자열의 첫 글자 = 받침 있을 때, 두 번째 = 받침 없을 때
  const withBatchim = type.charAt(0);
  const withoutBatchim = type.charAt(1);
  return hasBatchim ? `${word}${withBatchim}` : `${word}${withoutBatchim}`;
}
