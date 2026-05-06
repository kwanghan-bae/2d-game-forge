import type { EquipmentInstance, EquipmentBase, EquipmentRarity } from '../types';
import { EQUIPMENT_BASES, getEquipmentBase, createInstance } from '../data/equipment';

const RARITY_ORDER: EquipmentRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const TIER_UP_COST: Record<EquipmentRarity, number> = {
  common: 100,
  uncommon: 500,
  rare: 2500,
  epic: 12000,
  legendary: 100000,
  mythic: 0,
};

export function getNextTier(rarity: EquipmentRarity): EquipmentRarity | null {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1]!;
}

export function getCraftCost(fromRarity: EquipmentRarity): number {
  return TIER_UP_COST[fromRarity];
}

export function pickCraftResultBase(source: EquipmentBase): EquipmentBase | null {
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return null;
  const candidates = EQUIPMENT_BASES.filter(
    e => e.slot === source.slot && e.rarity === nextTier
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

export type CraftFailReason = 'not-enough-items' | 'no-next-tier' | 'no-result' | 'not-enough-gold';

export interface CraftAttempt {
  ok: boolean;
  reason?: CraftFailReason;
  /** 성공 시 새 인스턴스 (enhanceLv = 0) */
  result?: EquipmentInstance;
  /** 새 인스턴스의 base. 비용/UI 계산에 사용 */
  resultBase?: EquipmentBase;
  cost?: number;
  /** 성공 시 소비할 instanceId 3개 — store 가 inventory 에서 제거 */
  consumedInstanceIds?: [string, string, string];
}

/**
 * 동일 baseId 인스턴스 3개를 합성한다. enhanceLv 손실 (결과 = lv 0).
 */
export function attemptCraft(
  inventoryItems: EquipmentInstance[],
  sourceBaseId: string,
  gold: number,
): CraftAttempt {
  const source = getEquipmentBase(sourceBaseId);
  if (!source) return { ok: false, reason: 'not-enough-items' };
  const matching = inventoryItems.filter(i => i.baseId === sourceBaseId);
  if (matching.length < 3) return { ok: false, reason: 'not-enough-items' };
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return { ok: false, reason: 'no-next-tier' };
  const cost = getCraftCost(source.rarity);
  if (gold < cost) return { ok: false, reason: 'not-enough-gold', cost };
  const resultBase = pickCraftResultBase(source);
  if (!resultBase) return { ok: false, reason: 'no-result' };
  const result = createInstance(resultBase.id);
  const consumed: [string, string, string] = [
    matching[0]!.instanceId,
    matching[1]!.instanceId,
    matching[2]!.instanceId,
  ];
  return { ok: true, result, resultBase, cost, consumedInstanceIds: consumed };
}
