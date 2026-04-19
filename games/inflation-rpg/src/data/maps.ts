import type { MapArea } from '../types';

export const MAP_AREAS: MapArea[] = [
  { id: 'village-entrance', nameKR: '마을 입구',   levelRange: [1, 50],       bossId: undefined,          isHardOnly: false },
  { id: 'tavern-street',    nameKR: '주막 거리',    levelRange: [30, 200],     bossId: undefined,          isHardOnly: false },
  { id: 'goblin-pass',      nameKR: '도깨비 고개',  levelRange: [100, 500],    bossId: 'goblin-chief',     isHardOnly: false },
  { id: 'baekdu-gate',      nameKR: '백두 관문',    levelRange: [500, 2000],   bossId: 'gate-guardian',    isHardOnly: false },
  { id: 'kumgang-foot',     nameKR: '금강산 기슭',  levelRange: [1000, 5000],  bossId: undefined,          isHardOnly: false },
  { id: 'dragon-palace',    nameKR: '용궁 어귀',    levelRange: [3000, 10000], bossId: 'sea-god',          isHardOnly: false },
  { id: 'black-dragon-den', nameKR: '흑룡 소굴',    levelRange: [8000, 30000], bossId: 'black-dragon',     isHardOnly: false },
  { id: 'underworld-gate',  nameKR: '저승 입구',    levelRange: [20000, 80000],bossId: 'death-reaper',     isHardOnly: false },
  { id: 'heaven-realm',     nameKR: '천상계',       levelRange: [60000, 200000],bossId: 'jade-emperor',    isHardOnly: false },
  { id: 'chaos-land',       nameKR: '혼돈의 땅',    levelRange: [150000, 500000],bossId: 'chaos-god',      isHardOnly: false },
  { id: 'time-rift',        nameKR: '시간의 틈',    levelRange: [400000, 1000000],bossId: undefined,        isHardOnly: false },
  { id: 'hard-abyss',       nameKR: '심연',         levelRange: [100, 5000],   bossId: 'abyss-lord',       isHardOnly: true  },
  { id: 'hard-void',        nameKR: '공허',         levelRange: [5000, 50000], bossId: 'void-king',        isHardOnly: true  },
  { id: 'final-realm',      nameKR: '최종 구역',    levelRange: [500000, Infinity], bossId: 'final-boss',  isHardOnly: false },
];

export function getAreaById(id: string): MapArea | undefined {
  return MAP_AREAS.find(a => a.id === id);
}

export function getAvailableAreas(isHardMode: boolean): MapArea[] {
  return MAP_AREAS.filter(a => !a.isHardOnly || isHardMode);
}
