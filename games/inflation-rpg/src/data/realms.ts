import type { RealmId } from '../types';

export interface RealmDef {
  id: RealmId;
  nameKR: string;
  fieldLevelRange: [number, number];
  bgColor: string;
  columnRange: [number, number];
  enemyRoster: string[];
  bossId: string;
  nextRealm: RealmId | null;
}

export const REALM_CATALOG: readonly RealmDef[] = [
  { id: 'base',       nameKR: '시작의 들판', fieldLevelRange: [1, 50],            columnRange: [0, 20],   bgColor: '#3f6212', enemyRoster: ['wolf','bandit','goblin','dire_wolf','brigand','ogre'], bossId: 'base_boss',       nextRealm: 'sea' },
  { id: 'sea',        nameKR: '폭풍의 바다', fieldLevelRange: [50, 500],          columnRange: [20, 40],  bgColor: '#1e3a8a', enemyRoster: ['sea_serpent','kraken_spawn','tide_wraith','storm_eel'],         bossId: 'sea_boss',        nextRealm: 'volcano' },
  { id: 'volcano',    nameKR: '용암의 화산', fieldLevelRange: [500, 5000],        columnRange: [40, 60],  bgColor: '#7c2d12', enemyRoster: ['flame_drake','lava_golem','magma_imp','salamander'],            bossId: 'volcano_boss',    nextRealm: 'underworld' },
  { id: 'underworld', nameKR: '망자의 명계', fieldLevelRange: [5000, 50000],      columnRange: [60, 80],  bgColor: '#1f2937', enemyRoster: ['wraith','soul_collector','bone_lord','grim_reaper'],            bossId: 'underworld_boss', nextRealm: 'heaven' },
  { id: 'heaven',     nameKR: '천계의 평원', fieldLevelRange: [50000, 500000],    columnRange: [80, 100], bgColor: '#fef3c7', enemyRoster: ['celestial_guardian','angel','seraph','divine_envoy'],           bossId: 'heaven_boss',     nextRealm: 'chaos' },
  { id: 'chaos',      nameKR: '혼돈의 끝',   fieldLevelRange: [500000, 5_000_000], columnRange: [100, 120], bgColor: '#4c1d95', enemyRoster: ['void_horror','chaos_lord','reality_breaker','primordial_shade'], bossId: 'chaos_boss',      nextRealm: null },
];

export function findRealm(id: RealmId): RealmDef {
  const r = REALM_CATALOG.find(x => x.id === id);
  if (!r) throw new Error(`Unknown realm: ${id}`);
  return r;
}
