import type { VillageHeroSnapshot } from './types';

export type VillageEquipmentSlot = 'weapon' | 'armor' | 'talisman';

export interface VillageEquipmentDefinition {
  id: string;
  nameKR: string;
  slot: VillageEquipmentSlot;
  description: string;
  atk: number;
  def: number;
  hpMax: number;
  critRate: number;
}

export interface VillageEquipmentBonuses {
  atk: number;
  def: number;
  hpMax: number;
  critRate: number;
}

export const Village_EQUIPMENT_DEFINITIONS: Record<string, VillageEquipmentDefinition> = {
  iron_sword: {
    id: 'iron_sword', nameKR: '마을의 철검', slot: 'weapon',
    description: '대장간에서 반복 제작·강화할 수 있는 첫 무기입니다.',
    atk: 80, def: 0, hpMax: 0, critRate: 0,
  },
  guardian_armor: {
    id: 'guardian_armor', nameKR: '수호 갑옷', slot: 'armor',
    description: '회복과 안전한 원정을 돕는 방어 장비입니다.',
    atk: 0, def: 60, hpMax: 150, critRate: 0,
  },
  spirit_talisman: {
    id: 'spirit_talisman', nameKR: '영혼 부적', slot: 'talisman',
    description: '신력의 흐름을 읽어 치명타 기회를 높입니다.',
    atk: 20, def: 20, hpMax: 80, critRate: 0.03,
  },
};

export function getVillageEquipmentDefinition(id: string): VillageEquipmentDefinition | undefined {
  return Object.prototype.hasOwnProperty.call(Village_EQUIPMENT_DEFINITIONS, id)
    ? Village_EQUIPMENT_DEFINITIONS[id]
    : undefined;
}

export function getVillageEquipmentName(id: string): string {
  return getVillageEquipmentDefinition(id)?.nameKR ?? '기록된 장비';
}

function finiteBonus(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

const MAX_HERO_STAT = Number.MAX_SAFE_INTEGER;

function finiteHeroStat(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_HERO_STAT, Math.max(0, value))
    : fallback;
}

function addHeroStat(base: number, bonus: number): number {
  return Math.min(MAX_HERO_STAT, base + bonus);
}

export function getVillageEquipmentBonuses(
  equipmentIds: string[],
  equipmentLevels: Record<string, number> = {},
): VillageEquipmentBonuses {
  const result: VillageEquipmentBonuses = { atk: 0, def: 0, hpMax: 0, critRate: 0 };
  for (const id of new Set(equipmentIds)) {
    const definition = getVillageEquipmentDefinition(id);
    if (!definition) continue;
    const requestedLevel = equipmentLevels[id];
    const level = typeof requestedLevel === 'number' && Number.isFinite(requestedLevel)
      ? Math.max(1, Math.min(20, Math.floor(requestedLevel)))
      : 1;
    result.atk += definition.atk * level;
    result.def += definition.def * level;
    result.hpMax += definition.hpMax * level;
    result.critRate += definition.critRate * level;
  }
  return result;
}

export function applyVillageEquipmentBonuses(hero: VillageHeroSnapshot, bonuses: VillageEquipmentBonuses): void {
  const atk = finiteBonus(bonuses.atk);
  const def = finiteBonus(bonuses.def);
  const hpMax = finiteBonus(bonuses.hpMax);
  const critRate = finiteBonus(bonuses.critRate);
  hero.atk = addHeroStat(finiteHeroStat(hero.atk), atk);
  hero.def = addHeroStat(finiteHeroStat(hero.def), def);
  hero.defBase = addHeroStat(finiteHeroStat(hero.defBase), def);
  hero.hpMax = Math.max(1, addHeroStat(finiteHeroStat(hero.hpMax), hpMax));
  hero.hp = Math.min(hero.hpMax, addHeroStat(finiteHeroStat(hero.hp), hpMax));
  const baseCritRate = typeof hero.critRateBase === 'number' && Number.isFinite(hero.critRateBase)
    ? Math.min(1, Math.max(0, hero.critRateBase))
    : 0.05;
  hero.critRateBase = Math.min(1, baseCritRate + critRate);
}
