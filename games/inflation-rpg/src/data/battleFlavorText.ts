/**
 * C130: Battle flavor text — contextual messages for combat events.
 * Each mechanic event maps to a pool of Korean messages shown briefly in the HUD.
 */

const OVERKILL_MESSAGES = [
  '일격에 쓰러졌다!',
  '압도적인 힘!',
  '먼지도 남지 않았다.',
  '눈 깜짝할 새에 끝났다.',
] as const;

const DANGER_ZONE_MESSAGES = [
  '강적의 기운이 느껴진다...',
  '위험한 영역에 진입했다!',
  '살기가 감돌고 있다.',
  '평범한 적이 아니다!',
] as const;

const CLOSE_CALL_MESSAGES = [
  '아슬아슬하게 살아남았다!',
  '구사일생!',
  '위기를 넘겼다... 간신히.',
  '죽음의 문턱에서 돌아왔다.',
] as const;

const CRITICAL_HIT_MESSAGES = [
  '치명타!',
  '급소를 관통했다!',
  '약점을 꿰뚫었다!',
] as const;

const COMBO_MESSAGES: Record<number, string> = {
  5: '연타 개시!',
  10: '멈출 수 없는 기세!',
  15: '무아지경!',
  20: '전설의 연격!',
};

export function getOverkillMessage(seed: number): string {
  return OVERKILL_MESSAGES[seed % OVERKILL_MESSAGES.length];
}

export function getDangerZoneMessage(seed: number): string {
  return DANGER_ZONE_MESSAGES[seed % DANGER_ZONE_MESSAGES.length];
}

export function getCloseCallMessage(seed: number): string {
  return CLOSE_CALL_MESSAGES[seed % CLOSE_CALL_MESSAGES.length];
}

export function getCriticalHitMessage(seed: number): string {
  return CRITICAL_HIT_MESSAGES[seed % CRITICAL_HIT_MESSAGES.length];
}

export function getComboMessage(streak: number): string | null {
  // Find the highest threshold met
  const thresholds = Object.keys(COMBO_MESSAGES).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) {
    if (streak >= t) return COMBO_MESSAGES[t];
  }
  return null;
}
