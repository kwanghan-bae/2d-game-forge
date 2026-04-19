export type StatKey = 'hp' | 'atk' | 'def' | 'agi' | 'luc';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EquipmentStats {
  flat?: Partial<Record<StatKey, number>>;
  percent?: Partial<Record<StatKey, number>>;
}

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  stats: EquipmentStats;
  dropAreaIds: string[];
  price: number;
}

export interface PassiveSkill {
  id: string;
  nameKR: string;
  description: string;
  effect: 'stat_boost' | 'beast_damage' | 'item_find' | 'life_conversion' | 'bp_ring';
  value: number;
}

export interface Character {
  id: string;
  nameKR: string;
  emoji: string;
  statFocus: string;
  statMultipliers: Record<StatKey, number>;
  passiveSkill: PassiveSkill;
  unlockSoulGrade: number;
}

export interface Monster {
  id: string;
  nameKR: string;
  emoji: string;
  levelMin: number;
  levelMax: number;
  hpMult: number;
  atkMult: number;
  defMult: number;
  expMult: number;
  goldMult: number;
  isBoss: false;
}

export interface Boss {
  id: string;
  nameKR: string;
  emoji: string;
  areaId: string;
  bpReward: number;
  isHardMode: boolean;
  hpMult: number;
  atkMult: number;
}

export interface MapArea {
  id: string;
  nameKR: string;
  levelRange: [number, number];
  bossId?: string;
  isHardOnly: boolean;
}

export type AllocatedStats = Record<StatKey, number>;

export interface Inventory {
  weapons: Equipment[];
  armors: Equipment[];
  accessories: Equipment[];
}

export interface RunState {
  characterId: string;
  level: number;
  exp: number;
  bp: number;
  statPoints: number;
  allocated: AllocatedStats;
  currentAreaId: string;
  isHardMode: boolean;
  monstersDefeated: number;
  goldThisRun: number;
}

export interface MetaState {
  inventory: Inventory;
  baseAbilityLevel: number;
  soulGrade: number;
  hardModeUnlocked: boolean;
  characterLevels: Record<string, number>;
  bestRunLevel: number;
  normalBossesKilled: string[];
  hardBossesKilled: string[];
  gold: number;
}

export type Screen =
  | 'main-menu'
  | 'class-select'
  | 'world-map'
  | 'battle'
  | 'stat-alloc'
  | 'inventory'
  | 'shop'
  | 'game-over';
