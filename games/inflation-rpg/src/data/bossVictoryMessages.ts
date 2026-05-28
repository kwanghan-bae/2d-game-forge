/**
 * Cycle 40 — Narrative: 보스 유형별 승리 축하 메시지
 */
import type { BossType } from '../types';

const BOSS_VICTORY_MESSAGES: Record<BossType, string[]> = {
  mini: ['소탕 완료!', '첫 관문 돌파!', '약한 놈이었군!'],
  major: ['격파!', '강적 토벌!', '한 고비 넘겼다!'],
  sub: ['정복!', '부보스 격퇴!', '갈수록 강해진다!'],
  final: ['🌟 최종 보스 격파!', '전설의 승리!', '이 땅의 지배자여!', '천하제일!'],
};

export function getBossVictoryMessage(bossType: BossType): string {
  const pool = BOSS_VICTORY_MESSAGES[bossType];
  return pool[Math.floor(Math.random() * pool.length)]!;
}
