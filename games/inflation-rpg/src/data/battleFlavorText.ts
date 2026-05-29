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

// C143: additional flavor messages
const FIRST_BLOOD_MESSAGES = [
  '첫 전투 승리! 행운의 시작이다!',
  '여정의 첫 발걸음을 내디뎠다!',
  '강한 출발! 보상을 획득했다.',
] as const;

const REVENGE_KILL_MESSAGES = [
  '복수 완료! 원한을 갚았다!',
  '설욕전 승리! 이번엔 내가 이겼다!',
  '되갚아줬다!',
] as const;

const LUCKY_DODGE_MESSAGES = [
  '기적적으로 회피했다!',
  '운명이 아직 포기하지 않았다!',
  '죽음을 피했다... 아슬아슬하게!',
] as const;

const MERCY_MESSAGES = [
  '수호의 가호가 내렸다.',
  '잠시 동안 받는 피해가 줄어든다.',
  '연패의 아픔이 방어력이 되었다.',
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

export function getFirstBloodMessage(seed: number): string {
  return FIRST_BLOOD_MESSAGES[seed % FIRST_BLOOD_MESSAGES.length];
}

export function getRevengeKillMessage(seed: number): string {
  return REVENGE_KILL_MESSAGES[seed % REVENGE_KILL_MESSAGES.length];
}

export function getLuckyDodgeMessage(seed: number): string {
  return LUCKY_DODGE_MESSAGES[seed % LUCKY_DODGE_MESSAGES.length];
}

export function getMercyMessage(seed: number): string {
  return MERCY_MESSAGES[seed % MERCY_MESSAGES.length];
}

// C150: wave mechanic messages
const WAVE_STARTED_MESSAGES = [
  '웨이브 시작! 연속 전투!',
  '강적들이 몰려온다!',
  '파도처럼 밀려드는 적!',
] as const;

const WAVE_COMPLETE_MESSAGES = [
  '웨이브 클리어! 보너스 획득!',
  '연속 전투 완료! 대단하다!',
  '모든 적을 물리쳤다!',
] as const;

const MILESTONE_KILL_MESSAGES = [
  '처치 마일스톤 달성!',
  '전투력이 영구 상승했다!',
  '수많은 적을 쓰러뜨렸다!',
] as const;

const GOLD_LOSS_MESSAGES = [
  '골드를 잃었다...',
  '금화가 흩어졌다!',
  '패배의 대가를 치렀다.',
] as const;

export function getWaveStartedMessage(seed: number): string {
  return WAVE_STARTED_MESSAGES[seed % WAVE_STARTED_MESSAGES.length];
}

export function getWaveCompleteMessage(seed: number): string {
  return WAVE_COMPLETE_MESSAGES[seed % WAVE_COMPLETE_MESSAGES.length];
}

export function getMilestoneKillMessage(seed: number): string {
  return MILESTONE_KILL_MESSAGES[seed % MILESTONE_KILL_MESSAGES.length];
}

export function getGoldLossMessage(seed: number): string {
  return GOLD_LOSS_MESSAGES[seed % GOLD_LOSS_MESSAGES.length];
}

// C163: treasure goblin and boss vault messages
const TREASURE_GOBLIN_MESSAGES = [
  '보물 고블린이 나타났다!',
  '반짝이는 주머니를 든 고블린!',
  '금화를 잔뜩 가진 적이 출현!',
] as const;

const BOSS_VAULT_MESSAGES = [
  '보스의 금고가 열렸다!',
  '막대한 보물을 획득했다!',
  '금빛 보상이 쏟아진다!',
] as const;

const GOLD_SAVED_MESSAGES = [
  '기적적으로 금화를 지켰다!',
  '골드를 잃지 않았다!',
  '행운이 따랐다!',
] as const;

export function getTreasureGoblinMessage(seed: number): string {
  return TREASURE_GOBLIN_MESSAGES[seed % TREASURE_GOBLIN_MESSAGES.length];
}

export function getBossVaultMessage(seed: number): string {
  return BOSS_VAULT_MESSAGES[seed % BOSS_VAULT_MESSAGES.length];
}

export function getGoldSavedMessage(seed: number): string {
  return GOLD_SAVED_MESSAGES[seed % GOLD_SAVED_MESSAGES.length];
}
