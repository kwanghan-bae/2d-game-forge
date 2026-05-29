/** 퀘스트 완료 시 표시할 축하 메시지 풀. 랜덤 선택. */
export const QUEST_COMPLETE_MESSAGES: readonly string[] = [
  '임무 완수! 보상을 획득했다.',
  '훌륭하다! 실력이 나날이 느는군.',
  '약속을 지켰다. 의뢰인이 기뻐할 것이다.',
  '한 걸음 더 전설에 가까워졌다.',
  '이 정도면 마을의 영웅이라 불러도 되겠지.',
  '고된 여정이었지만, 보람이 있었다.',
  '새로운 길이 열리는 것 같다.',
  '경험이 힘이 된다. 다음 도전을 기대하자.',
];

export function getQuestCompleteMessage(): string {
  return QUEST_COMPLETE_MESSAGES[Math.floor(Math.random() * QUEST_COMPLETE_MESSAGES.length)]!;
}
