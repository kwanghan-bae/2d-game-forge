import type { Equipment, EquipmentRarity } from '../types';
import { EQUIPMENT_CATALOG, getEquipmentById } from '../data/equipment';

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

export function pickCraftResult(source: Equipment): Equipment | null {
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return null;
  const candidates = EQUIPMENT_CATALOG.filter(
    e => e.slot === source.slot && e.rarity === nextTier
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

export type CraftFailReason = 'not-enough-items' | 'no-next-tier' | 'no-result' | 'not-enough-gold';

export interface CraftAttempt {
  ok: boolean;
  reason?: CraftFailReason;
  result?: Equipment;
  cost?: number;
}

export function attemptCraft(
  inventoryItems: Equipment[],
  sourceId: string,
  gold: number,
): CraftAttempt {
  const source = getEquipmentById(sourceId);
  if (!source) return { ok: false, reason: 'not-enough-items' };
  const matching = inventoryItems.filter(i => i.id === sourceId);
  if (matching.length < 3) return { ok: false, reason: 'not-enough-items' };
  const nextTier = getNextTier(source.rarity);
  if (!nextTier) return { ok: false, reason: 'no-next-tier' };
  const cost = getCraftCost(source.rarity);
  if (gold < cost) return { ok: false, reason: 'not-enough-gold', cost };
  const result = pickCraftResult(source);
  if (!result) return { ok: false, reason: 'no-result' };
  return { ok: true, result, cost };
}
