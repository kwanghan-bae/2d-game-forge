/**
 * C944: BuffCatalog — centralized buff metadata registry.
 * Maps buff IDs used in DurationBuffTracker to display info.
 * Single source of truth for buff names/categories.
 */

export interface BuffMeta {
  nameKR: string;
  category: 'combat' | 'event' | 'environment' | 'village' | 'reputation' | 'permanent';
}

const BUFF_CATALOG: Record<string, BuffMeta> = {
  // Combat buffs
  merc_shield: { nameKR: '용병 방패', category: 'combat' },
  xr_atk: { nameKR: '갈림길 ATK', category: 'event' },
  xr_exp: { nameKR: '갈림길 EXP', category: 'event' },
  wm_atk: { nameKR: '상인 ATK', category: 'event' },
  em_atk: { nameKR: '기세 ATK', category: 'event' },
  em_exp: { nameKR: '기세 EXP', category: 'event' },
  // Reputation buffs
  rep_atk: { nameKR: '명성 ATK', category: 'reputation' },
  rep_shield: { nameKR: '명성 방패', category: 'reputation' },
  rep_exp: { nameKR: '명성 EXP', category: 'reputation' },
  // Veteran's Trial
  vt_atk: { nameKR: '노련 ATK', category: 'reputation' },
  vt_shield: { nameKR: '노련 방패', category: 'reputation' },
  vt_exp: { nameKR: '노련 EXP', category: 'reputation' },
  // Last Stand
  ls_atk: { nameKR: '최후의 항전 ATK', category: 'combat' },
  // Final Reckoning
  fr_atk: { nameKR: '최종 심판 ATK', category: 'event' },
  fr_shield: { nameKR: '최종 심판 방패', category: 'event' },
  fr_exp: { nameKR: '최종 심판 EXP', category: 'event' },
  greedy_gold: { nameKR: '탐욕 골드', category: 'event' },
  ft_atk: { nameKR: '첫 시련 ATK', category: 'event' },
  ft_exp: { nameKR: '첫 시련 EXP', category: 'event' },
  ws_exp: { nameKR: '현자 EXP', category: 'event' },
  ws_atk: { nameKR: '현자 ATK', category: 'event' },
  ej_atk: { nameKR: '장로 ATK', category: 'event' },
  ej_shield: { nameKR: '장로 방패', category: 'event' },
  ej_exp: { nameKR: '장로 EXP', category: 'event' },
  // Environment effects
  colosseum: { nameKR: '콜로세움', category: 'environment' },
  void_rift: { nameKR: '공허 균열', category: 'environment' },
  trial_grounds: { nameKR: '시험장', category: 'environment' },
  rain_sanctuary: { nameKR: '비의 성소', category: 'environment' },
  fog_ambush: { nameKR: '안개 매복', category: 'environment' },
  wind_gale: { nameKR: '돌풍', category: 'environment' },
  clear_sky: { nameKR: '맑은 하늘', category: 'environment' },
  snow_drift: { nameKR: '눈보라', category: 'environment' },
  titan_arena: { nameKR: '타이탄 투기장', category: 'environment' },
  crimson_tithe: { nameKR: '핏빛 공물', category: 'environment' },
  astral_paradox: { nameKR: '성계 역설', category: 'environment' },
  soul_forge: { nameKR: '영혼 화로', category: 'environment' },
  // Misc event buffs
  prestige_echo: { nameKR: '명성 메아리', category: 'event' },
  inspiration: { nameKR: '영감', category: 'event' },
  mentor: { nameKR: '멘토', category: 'event' },
  ev_mom_atk: { nameKR: '이벤트 기세 ATK', category: 'event' },
  ev_mom_density: { nameKR: '이벤트 기세 밀도', category: 'event' },
  // Late-game buffs
  endgame_surge: { nameKR: '종반 쇄도 ATK', category: 'event' },
  ascension_trial: { nameKR: '승천 시련', category: 'event' },
  echo_memory: { nameKR: '기억의 메아리 ATK', category: 'event' },
  // C945: Combat duration buffs (migrated from manual *Remaining fields)
  boss_fury: { nameKR: '보스 분노', category: 'combat' },
  wave_momentum: { nameKR: '파도 기세', category: 'combat' },
  elite_chain_atk: { nameKR: '엘리트 연쇄 ATK', category: 'combat' },
  // C948: More combat duration migrations
  village_training: { nameKR: '마을 훈련', category: 'village' },
  village_rest_atk: { nameKR: '마을 휴식 ATK', category: 'village' },
  revenge_streak: { nameKR: '복수 연쇄', category: 'combat' },
  death_atk_surge: { nameKR: '죽음의 쇄도', category: 'combat' },
  village_atk_training: { nameKR: '마을 ATK 훈련', category: 'village' },
  // C950: More migrations
  wave_exhaustion: { nameKR: '파도 탈진', category: 'combat' },
  shield_break_burst: { nameKR: '방패 파괴 폭발', category: 'combat' },
  danger_cascade: { nameKR: '위험 연쇄', category: 'combat' },
  elite_fury: { nameKR: '엘리트 분노', category: 'combat' },
  sacrifice_fury: { nameKR: '희생 분노', category: 'combat' },
  boss_slayer: { nameKR: '보스 슬레이어', category: 'combat' },
  armor: { nameKR: '갑옷', category: 'village' },
  village_rest: { nameKR: '마을 휴식', category: 'village' },
  village_blessing: { nameKR: '마을 축복', category: 'village' },
  gold_overflow_shield: { nameKR: '골드 오버플로우 방패', category: 'combat' },
  boss_shield: { nameKR: '보스 방패', category: 'combat' },
  mercy: { nameKR: '자비', category: 'combat' },
  revenge_gold: { nameKR: '복수 골드', category: 'combat' },
};

/** Get display name for a buff ID. Falls back to ID if not found. */
export function getBuffNameKR(buffId: string): string {
  return BUFF_CATALOG[buffId]?.nameKR ?? buffId;
}

/** Get category for a buff ID. */
export function getBuffCategory(buffId: string): BuffMeta['category'] | undefined {
  return BUFF_CATALOG[buffId]?.category;
}

/** Get all registered buff IDs. */
export function getAllBuffIds(): string[] {
  return Object.keys(BUFF_CATALOG);
}

export { BUFF_CATALOG };
