export type LandmarkKind =
  | 'village'       // 마을 (safe / market in future)
  | 'enemy'         // 일반 적 spawn point
  | 'boss'          // boss spawn point
  | 'shrine'        // 사당 (V1b 가 wire)
  | 'cave'          // 동굴 (V1b 가 wire — special encounter)
  | 'market'        // 시장 (V1b)
  | 'ruin'          // 폐허 (V1b)
  | 'exit'          // exit / 다음 zone 진입
  | 'rival'         // 라이벌 (V1b)
  | 'watchtower'    // 망루 — heroic drift 인카운터 (V1c-1)
  | 'treasure_cave' // 보물동굴 — prudent drift 인카운터 (V1c-1)
  | 'holy_ruin'     // 신성유적 — pious drift 인카운터 (V1c-1)
  | 'crossroads'    // 갈림길 — moral drift 인카운터 (V1c-1)
  // V3-H F3/F5: 절경 + 시련
  | 'sightseeing'   // 절경 랜드마크 (personality +1 랜덤)
  | 'trial';        // 시련의 제단 (고위험 고보상)

export interface LandmarkType {
  id: string;
  nameKR: string;
  emoji: string;
  kind: LandmarkKind;
}

export const LANDMARK_TYPES: readonly LandmarkType[] = [
  { id: 'village',    nameKR: '마을',         emoji: '🏘️', kind: 'village' },
  // forest 라인 — wolf 계열, chapter 따라 진화 (V1e)
  { id: 'wolf',              nameKR: '늑대',         emoji: '🐺', kind: 'enemy' },
  { id: 'dire_wolf',         nameKR: '거대 늑대',    emoji: '🐺', kind: 'enemy' },
  { id: 'shadow_beast',      nameKR: '어둠의 짐승',  emoji: '🦝', kind: 'enemy' },
  { id: 'nightmare_stalker', nameKR: '악몽 추적자',  emoji: '👁️', kind: 'enemy' },
  // plains 라인 — 인간 적 계열 (V1e)
  { id: 'bandit',      nameKR: '도적',         emoji: '🥷', kind: 'enemy' },
  { id: 'brigand',     nameKR: '무법자',       emoji: '🗡️', kind: 'enemy' },
  { id: 'warlord',     nameKR: '군벌',         emoji: '⚔️', kind: 'enemy' },
  { id: 'dark_knight', nameKR: '어둠의 기사',  emoji: '🛡️', kind: 'enemy' },
  // mountains 라인 — 거대 종 계열 (V1e)
  { id: 'goblin',        nameKR: '고블린',       emoji: '👹', kind: 'enemy' },
  { id: 'ogre',          nameKR: '오우거',       emoji: '👺', kind: 'enemy' },
  { id: 'troll',         nameKR: '트롤',         emoji: '🧌', kind: 'enemy' },
  { id: 'demon_warrior', nameKR: '악마 전사',    emoji: '😈', kind: 'enemy' },
  // bosses — placement variety (V1e adds chimera_lord + lich_king)
  { id: 'wolf_lord',    nameKR: '늑대 두목',    emoji: '🐺', kind: 'boss' },
  { id: 'chimera_lord', nameKR: '키메라 군주',  emoji: '🦁', kind: 'boss' },
  { id: 'dragon',       nameKR: '용',           emoji: '🐉', kind: 'boss' },
  { id: 'lich_king',    nameKR: '리치 왕',      emoji: '💀', kind: 'boss' },
  // landmarks
  { id: 'shrine',     nameKR: '사당',         emoji: '🛐', kind: 'shrine' },
  { id: 'cave',       nameKR: '동굴',         emoji: '🕳️', kind: 'cave' },
  { id: 'market',     nameKR: '시장',         emoji: '🛒', kind: 'market' },
  { id: 'ruin',       nameKR: '폐허',         emoji: '🏛️', kind: 'ruin' },
  { id: 'exit',       nameKR: '경계',         emoji: '🚪', kind: 'exit' },
  // V1c-1: personality drift 인카운터 랜드마크
  { id: 'watchtower',    nameKR: '망루',         emoji: '🗼', kind: 'watchtower' },
  { id: 'treasure_cave', nameKR: '보물동굴',     emoji: '💎', kind: 'treasure_cave' },
  { id: 'holy_ruin',     nameKR: '신성유적',     emoji: '⛩️', kind: 'holy_ruin' },
  { id: 'crossroads',    nameKR: '갈림길',       emoji: '🚦', kind: 'crossroads' },

  // V3-D realm 1: sea
  { id: 'sea_serpent',       nameKR: '바다뱀',       emoji: '🐍', kind: 'enemy' },
  { id: 'kraken_spawn',      nameKR: '크라켄 새끼',   emoji: '🐙', kind: 'enemy' },
  { id: 'tide_wraith',       nameKR: '조수 망령',     emoji: '🌊', kind: 'enemy' },
  { id: 'storm_eel',         nameKR: '폭풍 장어',     emoji: '⚡', kind: 'enemy' },
  { id: 'sea_boss',          nameKR: '심해의 왕',     emoji: '🦑', kind: 'boss' },

  // V3-D realm 2: volcano
  { id: 'flame_drake',       nameKR: '용암 드레이크', emoji: '🐉', kind: 'enemy' },
  { id: 'lava_golem',        nameKR: '용암 골렘',     emoji: '🗿', kind: 'enemy' },
  { id: 'magma_imp',         nameKR: '마그마 임프',   emoji: '👹', kind: 'enemy' },
  { id: 'salamander',        nameKR: '불도마뱀',      emoji: '🦎', kind: 'enemy' },
  { id: 'volcano_boss',      nameKR: '화염의 군주',   emoji: '🔥', kind: 'boss' },

  // V3-D realm 3: underworld
  { id: 'wraith',            nameKR: '망령',          emoji: '👻', kind: 'enemy' },
  { id: 'soul_collector',    nameKR: '영혼 수집가',   emoji: '💀', kind: 'enemy' },
  { id: 'bone_lord',         nameKR: '뼈의 왕',       emoji: '☠️', kind: 'enemy' },
  { id: 'grim_reaper',       nameKR: '사신',          emoji: '🪦', kind: 'enemy' },
  { id: 'underworld_boss',   nameKR: '명계의 군주',   emoji: '🕯️', kind: 'boss' },

  // V3-D realm 4: heaven
  { id: 'celestial_guardian',nameKR: '천계 수호자',   emoji: '⚔️', kind: 'enemy' },
  { id: 'angel',             nameKR: '천사',          emoji: '😇', kind: 'enemy' },
  { id: 'seraph',            nameKR: '세라핌',        emoji: '👼', kind: 'enemy' },
  { id: 'divine_envoy',      nameKR: '신의 사도',     emoji: '✨', kind: 'enemy' },
  { id: 'heaven_boss',       nameKR: '천계의 대천사', emoji: '🌟', kind: 'boss' },

  // V3-D realm 5: chaos
  { id: 'void_horror',       nameKR: '공허의 공포',   emoji: '🌌', kind: 'enemy' },
  { id: 'chaos_lord',        nameKR: '혼돈의 군주',   emoji: '🌀', kind: 'enemy' },
  { id: 'reality_breaker',   nameKR: '현실 파괴자',   emoji: '⚫', kind: 'enemy' },
  { id: 'primordial_shade',  nameKR: '태초의 그림자', emoji: '🌑', kind: 'enemy' },
  { id: 'chaos_boss',        nameKR: '혼돈의 끝',     emoji: '♾️', kind: 'boss' },

  // base realm boss (column 19 end)
  { id: 'base_boss',         nameKR: '들판의 왕',     emoji: '👑', kind: 'boss' },

  // V3-H F3: 절경 sightseeing landmark (personality dim +1 랜덤)
  { id: 'mountain_peak',  nameKR: '산정',        emoji: '⛰️', kind: 'sightseeing' },
  { id: 'ancient_tree',   nameKR: '고대의 나무', emoji: '🌳', kind: 'sightseeing' },
  { id: 'waterfall',      nameKR: '폭포',        emoji: '💧', kind: 'sightseeing' },
  { id: 'starry_field',   nameKR: '별빛 들판',   emoji: '✨', kind: 'sightseeing' },
  { id: 'sacred_grove',   nameKR: '신성한 숲',   emoji: '🌲', kind: 'sightseeing' },

  // V3-H F5: 시련의 제단 (trial)
  { id: 'trial_altar',    nameKR: '시련의 제단', emoji: '🗿', kind: 'trial' },
];
