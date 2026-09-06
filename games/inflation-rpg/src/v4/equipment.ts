import type { V4HeroSnapshot } from './types';

export type V4EquipmentSlot = 'weapon' | 'armor' | 'talisman';

export interface V4EquipmentDefinition {
  id: string;
  nameKR: string;
  slot: V4EquipmentSlot;
  description: string;
  atk: number;
  def: number;
  hpMax: number;
  critRate: number;
}

export interface V4EquipmentBonuses {
  atk: number;
  def: number;
  hpMax: number;
  critRate: number;
}

export const V4_EQUIPMENT_DEFINITIONS: Record<string, V4EquipmentDefinition> = {
  v4_iron_sword: {
    id: 'v4_iron_sword', nameKR: '마을의 철검', slot: 'weapon',
    description: '대장간에서 반복 제작·강화할 수 있는 첫 무기입니다.',
    atk: 80, def: 0, hpMax: 0, critRate: 0,
  },
  v4_guardian_armor: {
    id: 'v4_guardian_armor', nameKR: '수호 갑옷', slot: 'armor',
    description: '회복과 안전한 원정을 돕는 방어 장비입니다.',
    atk: 0, def: 60, hpMax: 150, critRate: 0,
  },
  v4_spirit_talisman: {
    id: 'v4_spirit_talisman', nameKR: '영혼 부적', slot: 'talisman',
    description: '신력의 흐름을 읽어 치명타 기회를 높입니다.',
    atk: 20, def: 20, hpMax: 80, critRate: 0.03,
  },
};

export function getV4EquipmentDefinition(id: string): V4EquipmentDefinition | undefined {
  return V4_EQUIPMENT_DEFINITIONS[id];
}

export function getV4EquipmentName(id: string): string {
  return getV4EquipmentDefinition(id)?.nameKR ?? '기록된 장비';
}

export function getV4EquipmentBonuses(
  equipmentIds: string[],
  equipmentLevels: Record<string, number> = {},
): V4EquipmentBonuses {
  const result: V4EquipmentBonuses = { atk: 0, def: 0, hpMax: 0, critRate: 0 };
  for (const id of new Set(equipmentIds)) {
    const definition = getV4EquipmentDefinition(id);
    if (!definition) continue;
    const level = Math.max(1, Math.min(20, Math.floor(equipmentLevels[id] ?? 1)));
    result.atk += definition.atk * level;
    result.def += definition.def * level;
    result.hpMax += definition.hpMax * level;
    result.critRate += definition.critRate * level;
  }
  return result;
}

export function applyV4EquipmentBonuses(hero: V4HeroSnapshot, bonuses: V4EquipmentBonuses): void {
  hero.atk += bonuses.atk;
  hero.def += bonuses.def;
  hero.defBase += bonuses.def;
  hero.hpMax += bonuses.hpMax;
  hero.hp = Math.min(hero.hpMax, hero.hp + bonuses.hpMax);
  hero.critRateBase = Math.min(1, hero.critRateBase + bonuses.critRate);
}
