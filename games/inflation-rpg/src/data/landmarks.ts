export type LandmarkKind =
  | 'village'   // 마을 (safe / market in future)
  | 'enemy'     // 일반 적 spawn point
  | 'boss'      // boss spawn point
  | 'shrine'    // 사당 (V1b 가 wire)
  | 'cave'      // 동굴 (V1b 가 wire — special encounter)
  | 'market'    // 시장 (V1b)
  | 'ruin'      // 폐허 (V1b)
  | 'exit'      // exit / 다음 zone 진입
  | 'rival';    // 라이벌 (V1b)

export interface LandmarkType {
  id: string;
  nameKR: string;
  emoji: string;
  kind: LandmarkKind;
}

export const LANDMARK_TYPES: readonly LandmarkType[] = [
  { id: 'village',    nameKR: '마을',         emoji: '🏘️', kind: 'village' },
  { id: 'wolf',       nameKR: '늑대',         emoji: '🐺', kind: 'enemy' },
  { id: 'goblin',     nameKR: '고블린',       emoji: '👹', kind: 'enemy' },
  { id: 'bandit',     nameKR: '도적',         emoji: '🥷', kind: 'enemy' },
  { id: 'wolf_lord',  nameKR: '늑대 두목',    emoji: '🐺', kind: 'boss' },
  { id: 'dragon',     nameKR: '용',           emoji: '🐉', kind: 'boss' },
  { id: 'shrine',     nameKR: '사당',         emoji: '🛐', kind: 'shrine' },
  { id: 'cave',       nameKR: '동굴',         emoji: '🕳️', kind: 'cave' },
  { id: 'market',     nameKR: '시장',         emoji: '🛒', kind: 'market' },
  { id: 'ruin',       nameKR: '폐허',         emoji: '🏛️', kind: 'ruin' },
  { id: 'exit',       nameKR: '경계',         emoji: '🚪', kind: 'exit' },
];
