/**
 * celestialRelics.ts — C1067: Celestial Star Relics Equipment Socketing Engine.
 *
 * Allows heroes to forge and socket 4 legendary celestial star relics into equipment:
 * 1. Polaris Eye (북극성의 눈 · 北極之眼): Precision, Crit Rate & Penetration.
 * 2. Sirius Fang (시리우스의 송곳니 · 天狼之牙): Ferocity, Boss Damage & Crit Damage.
 * 3. Vega Veil (직녀성의 베일 · 織女之紗): Vitality, Ethereal Grace & Defense.
 * 4. Antares Heart (안타레스의 심장 · 大火之心): Elemental Resonance & Damage Reduction.
 */

import type { EquipmentInstance, CelestialRelicType } from '../types';

export type RelicSlotType = 'weapon' | 'armor' | 'accessory';

export interface RelicBonusStats {
  atkPercent?: number;
  hpPercent?: number;
  defPercent?: number;
  spdFlat?: number;
  critRate?: number;
  critDmg?: number;
  damageReduction?: number;
  elementalDmgPercent?: number;
  goldBoost?: number;
  expBoost?: number;
}

export interface CelestialRelicDef {
  id: CelestialRelicType;
  nameKR: string;
  hanja: string;
  emoji: string;
  constellation: string;
  color: string;
  costShards: number;
  costGold: number;
  description: string;
  bonuses: Record<RelicSlotType, RelicBonusStats>;
}

export const SOCKET_COST_SHARDS = 30;
export const SOCKET_COST_GOLD = 25000;
export const UNSOCKET_COST_SHARDS = 10;

export const CELESTIAL_RELICS: Record<CelestialRelicType, CelestialRelicDef> = {
  polaris_eye: {
    id: 'polaris_eye',
    nameKR: '북극성의 눈',
    hanja: '北極之眼',
    emoji: '⭐👁️',
    constellation: '작은곰자리 (북극성)',
    color: '#38bdf8',
    costShards: SOCKET_COST_SHARDS,
    costGold: SOCKET_COST_GOLD,
    description: '북천의 중심에서 영원히 빛나는 북극성의 정기. 약점을 정확히 꿰뚫는 혜안을 줍니다.',
    bonuses: {
      weapon: { atkPercent: 8, critRate: 0.05 },
      armor: { defPercent: 8, damageReduction: 0.02 },
      accessory: { goldBoost: 0.15, expBoost: 0.15 },
    },
  },
  sirius_fang: {
    id: 'sirius_fang',
    nameKR: '시리우스의 송곳니',
    hanja: '天狼之牙',
    emoji: '🐺🗡️',
    constellation: '큰개자리 (천랑성)',
    color: '#f43f5e',
    costShards: SOCKET_COST_SHARDS,
    costGold: SOCKET_COST_GOLD,
    description: '밤하늘에서 가장 눈부신 천랑성의 흉포한 살기. 강적을 찢어발기는 파괴력을 내립니다.',
    bonuses: {
      weapon: { atkPercent: 10, critDmg: 0.20 },
      armor: { hpPercent: 10, damageReduction: 0.01 },
      accessory: { spdFlat: 6, critRate: 0.04 },
    },
  },
  vega_veil: {
    id: 'vega_veil',
    nameKR: '직녀성의 베일',
    hanja: '織女之紗',
    emoji: '🌌🧕',
    constellation: '거문고자리 (직녀성)',
    color: '#a855f7',
    costShards: SOCKET_COST_SHARDS,
    costGold: SOCKET_COST_GOLD,
    description: '은하수 건너 직녀가 자아낸 신비로운 성운의 장막. 생명력과 방어력을 극대화합니다.',
    bonuses: {
      weapon: { atkPercent: 6, hpPercent: 6 },
      armor: { hpPercent: 12, defPercent: 6 },
      accessory: { elementalDmgPercent: 10, hpPercent: 8 },
    },
  },
  antares_heart: {
    id: 'antares_heart',
    nameKR: '안타레스의 심장',
    hanja: '大火之心',
    emoji: '🔥❤️',
    constellation: '전갈자리 (심수이)',
    color: '#f97316',
    costShards: SOCKET_COST_SHARDS,
    costGold: SOCKET_COST_GOLD,
    description: '붉게 타오르는 화성의 적수(대화). 원소 공명 폭발력과 절대적인 피해 감소를 선사합니다.',
    bonuses: {
      weapon: { elementalDmgPercent: 15, atkPercent: 6 },
      armor: { damageReduction: 0.03, defPercent: 10 },
      accessory: { atkPercent: 6, defPercent: 6, critRate: 0.03 },
    },
  },
};

export const ALL_CELESTIAL_RELICS: readonly CelestialRelicType[] = [
  'polaris_eye',
  'sirius_fang',
  'vega_veil',
  'antares_heart',
];

/**
 * Checks if a relic can be socketed into the equipment instance.
 */
export function canSocketRelic(
  instance: EquipmentInstance,
  relicId: CelestialRelicType,
  availableShards: number,
  availableGold: number,
): boolean {
  if (!CELESTIAL_RELICS[relicId]) return false;
  if (instance.celestialRelic === relicId) return false; // Already socketed with this relic
  return availableShards >= SOCKET_COST_SHARDS && availableGold >= SOCKET_COST_GOLD;
}

/**
 * Sockets a celestial relic into an equipment instance.
 */
export function socketRelic(
  instance: EquipmentInstance,
  relicId: CelestialRelicType,
  availableShards: number,
  availableGold: number,
): {
  success: boolean;
  updatedInstance: EquipmentInstance;
  shardsSpent: number;
  goldSpent: number;
  message: string;
} {
  const def = CELESTIAL_RELICS[relicId];
  if (!def) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      goldSpent: 0,
      message: '존재하지 않는 성유물입니다.',
    };
  }

  if (instance.celestialRelic === relicId) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      goldSpent: 0,
      message: `이미 [${def.nameKR}]이(가) 장착되어 있습니다.`,
    };
  }

  if (availableShards < def.costShards) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      goldSpent: 0,
      message: `별빛 파편이 부족합니다. (필요: ${def.costShards}개)`,
    };
  }

  if (availableGold < def.costGold) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      goldSpent: 0,
      message: `골드가 부족합니다. (필요: ${def.costGold.toLocaleString()}G)`,
    };
  }

  const updatedInstance: EquipmentInstance = {
    ...instance,
    celestialRelic: relicId,
  };

  return {
    success: true,
    updatedInstance,
    shardsSpent: def.costShards,
    goldSpent: def.costGold,
    message: `장비에 [${def.nameKR}]을(를) 성공적으로 각인 장착했습니다!`,
  };
}

/**
 * Checks if a relic can be unsocketed.
 */
export function canUnsocketRelic(instance: EquipmentInstance, availableShards: number): boolean {
  return instance.celestialRelic != null && availableShards >= UNSOCKET_COST_SHARDS;
}

/**
 * Unsockets / extracts the celestial relic from an equipment instance.
 */
export function unsocketRelic(
  instance: EquipmentInstance,
  availableShards: number,
): {
  success: boolean;
  updatedInstance: EquipmentInstance;
  shardsSpent: number;
  message: string;
} {
  if (!instance.celestialRelic) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      message: '장착된 성유물이 없습니다.',
    };
  }

  if (availableShards < UNSOCKET_COST_SHARDS) {
    return {
      success: false,
      updatedInstance: instance,
      shardsSpent: 0,
      message: `성유물 추출에 필요한 별빛 파편이 부족합니다. (필요: ${UNSOCKET_COST_SHARDS}개)`,
    };
  }

  const updatedInstance: EquipmentInstance = {
    ...instance,
    celestialRelic: undefined,
  };

  return {
    success: true,
    updatedInstance,
    shardsSpent: UNSOCKET_COST_SHARDS,
    message: '성유물을 안전하게 추출 해제했습니다.',
  };
}

/**
 * Gets the bonus stats for a specific relic and slot type.
 */
export function getRelicBonusesForSlot(
  relicId: CelestialRelicType,
  slotType: RelicSlotType,
): RelicBonusStats {
  const def = CELESTIAL_RELICS[relicId];
  if (!def) return {};
  return def.bonuses[slotType] ?? {};
}

/**
 * Computes aggregated relic bonus stats across all equipped items with sockets.
 */
export function computeEquippedRelicBonuses(
  equipped: Array<{ instance: EquipmentInstance; slotType: RelicSlotType }>,
): RelicBonusStats {
  const total: RelicBonusStats = {
    atkPercent: 0,
    hpPercent: 0,
    defPercent: 0,
    spdFlat: 0,
    critRate: 0,
    critDmg: 0,
    damageReduction: 0,
    elementalDmgPercent: 0,
    goldBoost: 0,
    expBoost: 0,
  };

  for (const item of equipped) {
    if (!item.instance.celestialRelic) continue;
    const bonus = getRelicBonusesForSlot(item.instance.celestialRelic, item.slotType);

    if (bonus.atkPercent) total.atkPercent = (total.atkPercent ?? 0) + bonus.atkPercent;
    if (bonus.hpPercent) total.hpPercent = (total.hpPercent ?? 0) + bonus.hpPercent;
    if (bonus.defPercent) total.defPercent = (total.defPercent ?? 0) + bonus.defPercent;
    if (bonus.spdFlat) total.spdFlat = (total.spdFlat ?? 0) + bonus.spdFlat;
    if (bonus.critRate) total.critRate = (total.critRate ?? 0) + bonus.critRate;
    if (bonus.critDmg) total.critDmg = (total.critDmg ?? 0) + bonus.critDmg;
    if (bonus.damageReduction) total.damageReduction = (total.damageReduction ?? 0) + bonus.damageReduction;
    if (bonus.elementalDmgPercent) total.elementalDmgPercent = (total.elementalDmgPercent ?? 0) + bonus.elementalDmgPercent;
    if (bonus.goldBoost) total.goldBoost = (total.goldBoost ?? 0) + bonus.goldBoost;
    if (bonus.expBoost) total.expBoost = (total.expBoost ?? 0) + bonus.expBoost;
  }

  return total;
}
