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
  | 'crossroads';   // 갈림길 — moral drift 인카운터 (V1c-1)

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
];
