/**
 * reforgeSystem.ts — C1033: Blacksmith Reforging & Equipment Dismantling Engine.
 * 
 * Provides:
 * 1. Dismantling (분해): Unwanted/duplicate gear -> Enhance Stones (강화석) + Gold refund.
 * 2. Reforging (재연마/강화): Safe enhancement (+1 ~ +10) using Gold & Enhance Stones.
 *    - Zero destruction: On failure, enhance level never drops and gear never breaks.
 *    - Great Success (대성공): 1~15% chance to jump +2 levels at once (capped at +10).
 * 3. Batch Dismantling (일괄 분해): Dismantle unequipped items by rarity filter.
 * 4. Reforge stat scaling: Pure multiplier calculation for equipment base stats.
 */

import type { EquipmentInstance, EquipmentRarity, EquipmentSlot, Inventory } from '../types';
import { getEquipmentBase } from '../data/equipment';
import { removeFromInventory, getAllInstances } from './equipment';

export const MAX_ENHANCE_LEVEL = 10;

export interface DismantleYield {
  instanceId: string;
  baseId: string;
  name: string;
  rarity: EquipmentRarity;
  slot: EquipmentSlot;
  stones: number;
  goldRefund: number;
}

export interface ReforgeCost {
  gold: number;
  stones: number;
}

export interface ReforgeRates {
  successRate: number;       // e.g. 0.85 = 85%
  greatSuccessRate: number;  // e.g. 0.08 = 8% (within successful attempts)
  failureRate: number;       // 1 - successRate
}

export type ReforgeOutcome = 'success' | 'great_success' | 'failure' | 'max_level';

export interface ReforgeResult {
  outcome: ReforgeOutcome;
  prevLv: number;
  newLv: number;
  cost: ReforgeCost;
  statMultiplier: number;
}

const BASE_DISMANTLE_STONES: Record<EquipmentRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 15,
  legendary: 40,
  mythic: 100,
};

const RARITY_GOLD_SCALE: Record<EquipmentRarity, number> = {
  common: 1.0,
  uncommon: 1.5,
  rare: 2.5,
  epic: 4.0,
  legendary: 8.0,
  mythic: 16.0,
};

const RARITY_STONE_SCALE: Record<EquipmentRarity, number> = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0,
  mythic: 5.0,
};

const STAT_BONUS_PER_LV: Record<EquipmentRarity, number> = {
  common: 0.06,      // +60% at +10
  uncommon: 0.08,    // +80% at +10
  rare: 0.10,        // +100% at +10
  epic: 0.15,        // +150% at +10
  legendary: 0.20,   // +200% at +10
  mythic: 0.30,      // +300% at +10
};

/**
 * Calculates yield from dismantling an equipment item.
 * Higher rarity and existing enhanceLv grant bonus enhance stones.
 */
export function getDismantleYield(instance: EquipmentInstance): DismantleYield | null {
  const base = getEquipmentBase(instance.baseId);
  if (!base) return null;

  const baseStones = BASE_DISMANTLE_STONES[base.rarity];
  // 1 bonus stone per existing enhance level
  const totalStones = baseStones + (instance.enhanceLv ?? 0);
  // Gold refund: 50% of base price, min 50
  const goldRefund = Math.max(50, Math.floor(base.price * 0.5));

  return {
    instanceId: instance.instanceId,
    baseId: instance.baseId,
    name: base.name,
    rarity: base.rarity,
    slot: base.slot,
    stones: totalStones,
    goldRefund,
  };
}

/**
 * Dismantles a single equipment item from inventory.
 * Guards against dismantling currently equipped gear.
 */
export function dismantleSingleItem(
  inventory: Inventory,
  instanceId: string,
  equippedItemIds: string[],
): { success: boolean; newInventory: Inventory; yield?: DismantleYield; error?: string } {
  if (equippedItemIds.includes(instanceId)) {
    return { success: false, newInventory: inventory, error: 'equipped' };
  }

  const all = getAllInstances(inventory);
  const target = all.find(item => item.instanceId === instanceId);
  if (!target) {
    return { success: false, newInventory: inventory, error: 'not_found' };
  }

  const yieldData = getDismantleYield(target);
  if (!yieldData) {
    return { success: false, newInventory: inventory, error: 'unknown_base' };
  }

  const newInventory = removeFromInventory(inventory, instanceId);
  return {
    success: true,
    newInventory,
    yield: yieldData,
  };
}

/**
 * Batch dismantle all unequipped items matching specified rarities.
 */
export function batchDismantleItems(
  inventory: Inventory,
  raritiesToDismantle: EquipmentRarity[],
  equippedItemIds: string[],
): {
  newInventory: Inventory;
  dismantledCount: number;
  totalStones: number;
  totalGoldRefund: number;
} {
  const all = getAllInstances(inventory);
  const eligible = all.filter((item) => {
    if (equippedItemIds.includes(item.instanceId)) return false;
    const base = getEquipmentBase(item.baseId);
    return base && raritiesToDismantle.includes(base.rarity);
  });

  let currentInv = inventory;
  let totalStones = 0;
  let totalGoldRefund = 0;
  let dismantledCount = 0;

  for (const item of eligible) {
    const yieldData = getDismantleYield(item);
    if (yieldData) {
      currentInv = removeFromInventory(currentInv, item.instanceId);
      totalStones += yieldData.stones;
      totalGoldRefund += yieldData.goldRefund;
      dismantledCount++;
    }
  }

  return {
    newInventory: currentInv,
    dismantledCount,
    totalStones,
    totalGoldRefund,
  };
}

/**
 * Returns the cost to attempt reforge for an item at currentLv.
 */
export function getReforgeCost(rarity: EquipmentRarity, currentLv: number): ReforgeCost {
  const nextLv = currentLv + 1;
  const goldScale = RARITY_GOLD_SCALE[rarity];
  const stoneScale = RARITY_STONE_SCALE[rarity];

  // Base gold curve: 100 -> 250 -> 500 -> 1000 -> 2000 ...
  const baseGold = nextLv * nextLv * 100;
  const gold = Math.round(baseGold * goldScale);

  // Stones required: 1 to 5 base
  const baseStones = Math.max(1, Math.ceil(nextLv / 2));
  const stones = Math.max(1, Math.round(baseStones * stoneScale));

  return { gold, stones };
}

/**
 * Success and great-success rates per enhance level.
 */
export function getReforgeRates(currentLv: number): ReforgeRates {
  if (currentLv >= MAX_ENHANCE_LEVEL) {
    return { successRate: 0, greatSuccessRate: 0, failureRate: 1 };
  }

  // Guaranteed success up to +3
  if (currentLv < 3) {
    const greatRate = Math.max(0.08, 0.15 - currentLv * 0.03);
    return { successRate: 1.0, greatSuccessRate: greatRate, failureRate: 0 };
  }

  // Mid levels (+3 to +5): 85% ~ 75%
  if (currentLv < 6) {
    const successRate = 0.85 - (currentLv - 3) * 0.05;
    const greatRate = 0.06 - (currentLv - 3) * 0.01;
    return { successRate, greatSuccessRate: greatRate, failureRate: 1 - successRate };
  }

  // High levels (+6 to +8): 65% ~ 45%
  if (currentLv < 9) {
    const successRate = 0.65 - (currentLv - 6) * 0.10;
    const greatRate = 0.03;
    return { successRate, greatSuccessRate: greatRate, failureRate: 1 - successRate };
  }

  // Final level (+9 to +10): 35%
  return { successRate: 0.35, greatSuccessRate: 0.01, failureRate: 0.65 };
}

/**
 * Stat multiplier based on item rarity and enhancement level.
 */
export function getReforgedStatMultiplier(rarity: EquipmentRarity, enhanceLv: number): number {
  const bonusPerLv = STAT_BONUS_PER_LV[rarity] ?? 0.10;
  return 1 + bonusPerLv * Math.min(MAX_ENHANCE_LEVEL, Math.max(0, enhanceLv));
}

/**
 * Simulates or executes a reforge attempt given RNG rolls.
 * @param instance The equipment instance to reforge
 * @param rngRoll Random float in [0, 1) for success roll
 * @param greatRoll Random float in [0, 1) for great success roll
 */
export function attemptReforge(
  instance: EquipmentInstance,
  rngRoll: number,
  greatRoll: number = 0.5,
): ReforgeResult {
  const currentLv = instance.enhanceLv ?? 0;
  const base = getEquipmentBase(instance.baseId);
  const rarity: EquipmentRarity = base?.rarity ?? 'common';

  if (currentLv >= MAX_ENHANCE_LEVEL) {
    return {
      outcome: 'max_level',
      prevLv: currentLv,
      newLv: currentLv,
      cost: { gold: 0, stones: 0 },
      statMultiplier: getReforgedStatMultiplier(rarity, currentLv),
    };
  }

  const cost = getReforgeCost(rarity, currentLv);
  const rates = getReforgeRates(currentLv);

  if (rngRoll < rates.successRate) {
    const isGreat = greatRoll < rates.greatSuccessRate && currentLv + 2 <= MAX_ENHANCE_LEVEL;
    const newLv = isGreat ? currentLv + 2 : currentLv + 1;
    return {
      outcome: isGreat ? 'great_success' : 'success',
      prevLv: currentLv,
      newLv,
      cost,
      statMultiplier: getReforgedStatMultiplier(rarity, newLv),
    };
  }

  // Safe failure: Level never drops!
  return {
    outcome: 'failure',
    prevLv: currentLv,
    newLv: currentLv,
    cost,
    statMultiplier: getReforgedStatMultiplier(rarity, currentLv),
  };
}

/**
 * Formats equipment name with enhance badge.
 * e.g. "+5 용천검" or "용천검" if lv 0
 */
export function formatEnhancedName(baseName: string, enhanceLv: number): string {
  if (!enhanceLv || enhanceLv <= 0) return baseName;
  return `+${enhanceLv} ${baseName}`;
}

/**
 * C1037: Aggregates combat stat amplification from all currently equipped enhanced gear.
 * - Weapons: Grants additive ATK multiplier bonus based on enhancement stat multiplier.
 * - Armors: Grants 1% Damage Reduction per enhance level (capped at 15%).
 */
export function aggregateReforgeBonus(equipped: EquipmentInstance[]): {
  atkMulBonus: number;
  armorDrBonus: number;
} {
  let atkMulBonus = 0;
  let armorDrBonus = 0;

  for (const inst of equipped) {
    const lv = inst.enhanceLv ?? 0;
    if (lv <= 0) continue;
    const base = getEquipmentBase(inst.baseId);
    if (!base) continue;

    if (base.slot === 'weapon') {
      atkMulBonus += (getReforgedStatMultiplier(base.rarity, lv) - 1);
    } else if (base.slot === 'armor') {
      armorDrBonus += lv * 0.01;
    }
  }

  return {
    atkMulBonus,
    armorDrBonus: Math.min(0.15, armorDrBonus),
  };
}
