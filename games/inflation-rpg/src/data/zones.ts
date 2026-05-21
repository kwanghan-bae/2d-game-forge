export type ZoneId = 'village' | 'forest' | 'mountains' | 'plains' | 'mystic';

export interface Zone {
  id: ZoneId;
  nameKR: string;
  biome: string;
  bgColor: string; // hex — overworld scene base
  difficulty: number; // 1 = easy spawn pool, 5 = hardest
}

export const ZONES: readonly Zone[] = [
  { id: 'village',   nameKR: '시작 마을',     biome: 'town',    bgColor: '#422006', difficulty: 1 },
  { id: 'forest',    nameKR: '깊은 숲',       biome: 'forest',  bgColor: '#134e4a', difficulty: 2 },
  { id: 'plains',    nameKR: '광활한 평원',   biome: 'plains',  bgColor: '#3f6212', difficulty: 2 },
  { id: 'mountains', nameKR: '암벽의 산악',   biome: 'mountain',bgColor: '#44403c', difficulty: 3 },
  { id: 'mystic',    nameKR: '신비의 차원',   biome: 'mystic',  bgColor: '#1e1b4b', difficulty: 5 },
];
