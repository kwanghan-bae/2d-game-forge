import type { EquipmentInstance, EquipmentRarity, EquipmentStats, StatKey } from '../types';
import { getEquipmentBase } from '../data/equipment';

const PER_LV_MULT: Record<EquipmentRarity, number> = {
  common: 0.05,
  uncommon: 0.07,
  rare: 0.10,
  epic: 0.15,
  legendary: 0.22,
  mythic: 2.0,
};

const RARITY_COST_MULT: Record<EquipmentRarity, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4,
  legendary: 8,
  mythic: 16,
};

// Phase 3 (E): 광고 SDK 통합 시 평생 cap 식 추가 예정 (spec §3, §5).
// 설계: lifetimeEnhanceCap(adsWatched) = Math.min(100, 50 + Math.max(0, adsWatched))
// 현재는 lv 무제한 — cap 미구현 (TODO-c 검증 결과).
export function enhanceMultiplier(rarity: EquipmentRarity, lv: number): number {
  return 1 + PER_LV_MULT[rarity] * lv;
}

export function enhanceCost(rarity: EquipmentRarity, currentLv: number): { stones: number; dr: number } {
  const next = currentLv + 1;
  const rarityMult = RARITY_COST_MULT[rarity];
  return {
    stones: Math.ceil((next * next) / 5) * rarityMult,
    dr:     next * next * next * 100 * rarityMult,
  };
}

function mulRecord(rec: Partial<Record<StatKey, number>> | undefined, m: number): Partial<Record<StatKey, number>> {
  if (!rec) return {};
  const out: Partial<Record<StatKey, number>> = {};
  for (const [k, v] of Object.entries(rec) as [StatKey, number][]) {
    out[k] = Math.floor(v * m);
  }
  return out;
}

export function getInstanceStats(inst: EquipmentInstance): EquipmentStats {
  const base = getEquipmentBase(inst.baseId);
  if (!base) return {};
  const m = enhanceMultiplier(base.rarity, inst.enhanceLv);
  return {
    flat:    mulRecord(base.baseStats.flat, m),
    percent: mulRecord(base.baseStats.percent, m),
  };
}
