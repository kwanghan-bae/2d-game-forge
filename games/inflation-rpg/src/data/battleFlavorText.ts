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

// C135: boss rage + elite flavor messages
const BOSS_RAGE_MESSAGES = [
  '보스가 분노하고 있다!',
  '적의 공격이 거세진다!',
  '더 이상 지체할 수 없다!',
] as const;

const ELITE_MESSAGES = [
  '정예 몬스터 출현!',
  '강화된 적이 나타났다!',
  '특별한 기운을 가진 적이다!',
] as const;

const VILLAGE_REST_MESSAGES = [
  '깊은 휴식... 체력이 강해졌다.',
  '상처가 아물며 몸이 단단해진다.',
  '고된 전투의 보상이 찾아왔다.',
] as const;

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

export function getBossRageMessage(seed: number): string {
  return BOSS_RAGE_MESSAGES[seed % BOSS_RAGE_MESSAGES.length];
}

export function getEliteMessage(seed: number): string {
  return ELITE_MESSAGES[seed % ELITE_MESSAGES.length];
}

export function getVillageRestMessage(seed: number): string {
  return VILLAGE_REST_MESSAGES[seed % VILLAGE_REST_MESSAGES.length];
}
