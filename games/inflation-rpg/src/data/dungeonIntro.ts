/**
 * Cycle 35 — Narrative: 던전 입장 소개 텍스트
 * 던전 첫 진입 시 표시되는 짧은 분위기 설명.
 */
export const DUNGEON_INTRO: Record<string, string> = {
  plains: '넓게 펼쳐진 들판. 바람이 풀잎을 스치며 노래한다.',
  forest: '오래된 나무들이 하늘을 가렸다. 이끼 낀 길이 깊숙이 이어진다.',
  mountains: '험준한 바위와 차가운 바람. 정상은 구름 속에 숨었다.',
  sea: '파도 소리가 온 몸을 감싼다. 소금기 가득한 바닷길.',
  volcano: '발밑에서 열기가 솟아오른다. 용암이 붉게 빛나는 곳.',
  underworld: '어둠이 형체를 가진 듯하다. 영혼들의 속삭임이 들린다.',
  heaven: '구름 위의 세계. 눈부신 빛이 모든 것을 감싸안는다.',
  chaos: '현실이 뒤틀리는 차원의 경계. 어떤 법칙도 통하지 않는다.',
};

export function getDungeonIntro(dungeonId: string): string | null {
  return DUNGEON_INTRO[dungeonId] ?? null;
}
