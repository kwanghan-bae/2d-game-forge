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

// C176: Flavor text expansion 4 — dodge, exhaustion, greed, lifesteal, tithe

const DODGE_MESSAGES = [
  '적의 공격을 피했다!',
  '민첩하게 회피했다!',
  '빗나갔다!',
] as const;

const EXHAUSTION_MESSAGES = [
  '피로가 몰려온다...',
  '몸이 무거워지기 시작했다.',
  '쉬지 않고 싸우니 힘이 빠진다.',
] as const;

const GREED_MODE_MESSAGES = [
  '금화의 무게가 주머니를 짓누른다.',
  '부의 유혹에 눈이 어두워진다.',
  '탐욕이 지혜를 가린다.',
] as const;

const LIFESTEAL_MESSAGES = [
  '적의 생명력을 흡수했다!',
  '피를 나누어 받았다.',
  '적의 힘이 내 것이 된다.',
] as const;

const SHRINE_TITHE_MESSAGES = [
  '금화를 제단에 바쳤다.',
  '신전에 헌금을 올렸다.',
  '힘이 솟아오른다!',
] as const;

export function getDodgeMessage(seed: number): string {
  return DODGE_MESSAGES[seed % DODGE_MESSAGES.length];
}

export function getExhaustionMessage(seed: number): string {
  return EXHAUSTION_MESSAGES[seed % EXHAUSTION_MESSAGES.length];
}

export function getGreedModeMessage(seed: number): string {
  return GREED_MODE_MESSAGES[seed % GREED_MODE_MESSAGES.length];
}

export function getLifestealMessage(seed: number): string {
  return LIFESTEAL_MESSAGES[seed % LIFESTEAL_MESSAGES.length];
}

export function getShrineTitheMessage(seed: number): string {
  return SHRINE_TITHE_MESSAGES[seed % SHRINE_TITHE_MESSAGES.length];
}

// C191: Flavor text expansion 5 — treasure, cave, revenge, shield break, gold armor

const LUCKY_TREASURE_MESSAGES = [
  '반짝이는 보물 상자를 발견했다!',
  '전리품이 쏟아진다!',
  '운이 좋다! 숨겨진 금화를 찾았다.',
] as const;

const CAVE_TREASURE_MESSAGES = [
  '동굴 깊은 곳에서 보물을 발견했다!',
  '잊혀진 금은보화가 가득하다.',
  '탐험의 보상이 기다리고 있었다.',
] as const;

const REVENGE_GOLD_MESSAGES = [
  '복수의 불꽃이 금화로 돌아온다!',
  '쓰러진 자의 분노가 보상을 부른다.',
  '패배의 대가를 되찾는다!',
] as const;

const SHIELD_BREAK_MESSAGES = [
  '방패가 폭발하며 에너지를 방출한다!',
  '깨진 방패의 파편이 적을 관통한다!',
  '보호막이 산산조각, 충격파가 퍼진다!',
] as const;

const GOLD_ARMOR_MESSAGES = [
  '금화가 갑옷처럼 빛나고 있다.',
  '부의 무게가 방어가 된다.',
  '금으로 뒤덮인 피부가 단단하다.',
] as const;

export function getLuckyTreasureMessage(seed: number): string {
  return LUCKY_TREASURE_MESSAGES[seed % LUCKY_TREASURE_MESSAGES.length];
}

export function getCaveTreasureMessage(seed: number): string {
  return CAVE_TREASURE_MESSAGES[seed % CAVE_TREASURE_MESSAGES.length];
}

export function getRevengeGoldMessage(seed: number): string {
  return REVENGE_GOLD_MESSAGES[seed % REVENGE_GOLD_MESSAGES.length];
}

export function getShieldBreakMessage(seed: number): string {
  return SHIELD_BREAK_MESSAGES[seed % SHIELD_BREAK_MESSAGES.length];
}

export function getGoldArmorMessage(seed: number): string {
  return GOLD_ARMOR_MESSAGES[seed % GOLD_ARMOR_MESSAGES.length];
}

// C207: flavor text expansion 6
const CRIT_STREAK_MESSAGES = [
  '연속 회심! 멈출 수 없다!',
  '치명타의 연쇄!',
  '날카로운 감각이 폭발한다!',
];

const GOLD_INVEST_MESSAGES = [
  '투자 수익 회수!',
  '돈이 돈을 벌었다!',
  '기다린 보람이 있다!',
];

const DAMAGE_REFLECT_MESSAGES = [
  '공격이 되돌아간다!',
  '반사 데미지!',
  '가시 같은 반격!',
];

const BOSS_EXP_MESSAGES = [
  '보스의 경험치가 쏟아진다!',
  '대물을 잡은 보상!',
  '거대한 경험의 물결!',
];

const PRESTIGE_MESSAGES = [
  '새로운 시작, 더 강하게!',
  '윤회의 힘이 깃든다!',
  '전생의 기억이 되살아난다!',
];

export function getCritStreakMessage(seed: number): string {
  return CRIT_STREAK_MESSAGES[seed % CRIT_STREAK_MESSAGES.length];
}

export function getGoldInvestMessage(seed: number): string {
  return GOLD_INVEST_MESSAGES[seed % GOLD_INVEST_MESSAGES.length];
}

export function getDamageReflectMessage(seed: number): string {
  return DAMAGE_REFLECT_MESSAGES[seed % DAMAGE_REFLECT_MESSAGES.length];
}

export function getBossExpMessage(seed: number): string {
  return BOSS_EXP_MESSAGES[seed % BOSS_EXP_MESSAGES.length];
}

export function getPrestigeMessage(seed: number): string {
  return PRESTIGE_MESSAGES[seed % PRESTIGE_MESSAGES.length];
}

// C222: flavor text expansion 7
const NIGHT_MODE_MESSAGES = [
  '어둠 속에서 적이 더 강해진다!',
  '야간 전투! 경험치가 쏟아진다!',
  '밤의 위험, 밤의 보상!',
];

const ARENA_MESSAGES = [
  '아레나에 입장! 강적이 기다린다!',
  '관객의 환호가 들린다!',
  '도전자여, 증명하라!',
];

const GOLD_INVEST_RETURN_MESSAGES = [
  '투자금 회수! 3배의 이익!',
  '금화가 금화를 낳았다!',
  '인내의 보상!',
];

const ACHIEVEMENT_MESSAGES = [
  '업적 달성! 힘이 솟는다!',
  '이정표를 세웠다!',
  '전설에 한 걸음 더!',
];

const LUCKY_FIND_MESSAGES = [
  '바닥에 빛나는 것이...!',
  '행운의 발견!',
  '누군가 떨어뜨린 장비를 찾았다!',
];

export function getNightModeMessage(seed: number): string {
  return NIGHT_MODE_MESSAGES[seed % NIGHT_MODE_MESSAGES.length];
}

export function getArenaMessage(seed: number): string {
  return ARENA_MESSAGES[seed % ARENA_MESSAGES.length];
}

export function getGoldInvestReturnMessage(seed: number): string {
  return GOLD_INVEST_RETURN_MESSAGES[seed % GOLD_INVEST_RETURN_MESSAGES.length];
}

export function getAchievementMessage(seed: number): string {
  return ACHIEVEMENT_MESSAGES[seed % ACHIEVEMENT_MESSAGES.length];
}

export function getLuckyFindMessage(seed: number): string {
  return LUCKY_FIND_MESSAGES[seed % LUCKY_FIND_MESSAGES.length];
}

// C233: flavor text expansion 8
const BERSERKER_MESSAGES = [
  '광전사의 분노! 한계를 넘는다!',
  '피가 끓어오른다!',
  '죽음 앞에서 더 강해진다!',
];

const WEATHER_RAIN_MESSAGES = [
  '비가 시야를 가린다...',
  '빗속의 전투! 불리하다!',
  '젖은 손잡이가 미끄럽다!',
];

const WEATHER_WIND_MESSAGES = [
  '순풍이 경험을 실어온다!',
  '바람이 등을 밀어준다!',
  '상쾌한 바람에 집중력 상승!',
];

const BOUNTY_MESSAGES = [
  '현상금 수령!',
  '25마리 처치 보상!',
  '의뢰 완수! 금화를 받았다!',
];

const BANK_MESSAGES = [
  '은행에 금화를 맡겼다!',
  '저축은 미래의 투자!',
  '안전하게 보관됐다!',
];

export function getBerserkerMessage(seed: number): string {
  return BERSERKER_MESSAGES[seed % BERSERKER_MESSAGES.length];
}

export function getWeatherRainMessage(seed: number): string {
  return WEATHER_RAIN_MESSAGES[seed % WEATHER_RAIN_MESSAGES.length];
}

export function getWeatherWindMessage(seed: number): string {
  return WEATHER_WIND_MESSAGES[seed % WEATHER_WIND_MESSAGES.length];
}

export function getBountyMessage(seed: number): string {
  return BOUNTY_MESSAGES[seed % BOUNTY_MESSAGES.length];
}

export function getBankMessage(seed: number): string {
  return BANK_MESSAGES[seed % BANK_MESSAGES.length];
}

// C244: flavor text 9 — overkill_heal, exp_overflow, darkness_curse, time_pressure, companion
const OVERKILL_HEAL_MESSAGES = [
  '일격에 쓰러뜨리며 생명력이 회복됐다!',
  '압도적 승리, 체력이 차오른다!',
  '적의 에너지를 흡수했다!',
];

const EXP_OVERFLOW_MESSAGES = [
  '넘치는 경험치가 증폭됐다!',
  '레벨업의 여운이 남아있다!',
  '잔여 경험치 보너스 획득!',
];

const DARKNESS_CURSE_MESSAGES = [
  '어둠의 저주가 내려앉았다...',
  '연패의 그림자가 드리운다...',
  '저주받은 전사, 성소를 찾아야 한다...',
];

const TIME_PRESSURE_MESSAGES = [
  '시간이 흐를수록 적이 강해진다!',
  '전장의 긴장감이 고조된다!',
  '적들이 점점 단련되고 있다!',
];

const COMPANION_MESSAGES = [
  '동료의 응원으로 경험치가 늘었다!',
  '함께라서 더 빠르게 성장한다!',
  '동료가 전투를 지원한다!',
];

export function getOverkillHealMessage(seed: number): string {
  return OVERKILL_HEAL_MESSAGES[seed % OVERKILL_HEAL_MESSAGES.length];
}

export function getExpOverflowMessage(seed: number): string {
  return EXP_OVERFLOW_MESSAGES[seed % EXP_OVERFLOW_MESSAGES.length];
}

export function getDarknessCurseMessage(seed: number): string {
  return DARKNESS_CURSE_MESSAGES[seed % DARKNESS_CURSE_MESSAGES.length];
}

export function getTimePressureMessage(seed: number): string {
  return TIME_PRESSURE_MESSAGES[seed % TIME_PRESSURE_MESSAGES.length];
}

export function getCompanionMessage(seed: number): string {
  return COMPANION_MESSAGES[seed % COMPANION_MESSAGES.length];
}

// C254: flavor text 10 — specialization, elemental, survival_heal, chain_lightning, boss_slayer
const SPECIALIZATION_MESSAGES = [
  '각성한 전사의 힘이 폭발한다!',
  '전문화의 길, 더 강해졌다!',
  '프레스티지의 보상이 빛난다!',
];

const ELEMENTAL_MESSAGES = [
  '속성 약점을 찔렀다!',
  '원소의 힘이 적을 관통한다!',
  '상성 우위! 추가 피해!',
];

const SURVIVAL_HEAL_MESSAGES = [
  '연승의 기운으로 체력이 회복된다!',
  '전투 경험이 몸을 치유한다!',
  '생존 본능이 상처를 아물게 한다!',
];

const CHAIN_LIGHTNING_MESSAGES = [
  '연쇄 번개가 적을 강타한다!',
  '콤보의 전격이 폭발한다!',
  '번개 사슬이 적을 꿰뚫는다!',
];

const BOSS_SLAYER_MESSAGES = [
  '보스 처치의 여운이 남아있다!',
  '슬레이어의 기운으로 더 강하게!',
  '보스킬 버프 발동!',
];

export function getSpecializationMessage(seed: number): string {
  return SPECIALIZATION_MESSAGES[seed % SPECIALIZATION_MESSAGES.length];
}

export function getElementalMessage(seed: number): string {
  return ELEMENTAL_MESSAGES[seed % ELEMENTAL_MESSAGES.length];
}

export function getSurvivalHealMessage(seed: number): string {
  return SURVIVAL_HEAL_MESSAGES[seed % SURVIVAL_HEAL_MESSAGES.length];
}

export function getChainLightningMessage(seed: number): string {
  return CHAIN_LIGHTNING_MESSAGES[seed % CHAIN_LIGHTNING_MESSAGES.length];
}

export function getBossSlayerMessage(seed: number): string {
  return BOSS_SLAYER_MESSAGES[seed % BOSS_SLAYER_MESSAGES.length];
}
