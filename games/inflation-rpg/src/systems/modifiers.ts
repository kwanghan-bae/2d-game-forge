// games/inflation-rpg/src/systems/modifiers.ts
import { MODIFIERS } from '../data/modifiers';
import { enhanceMultiplier } from './enhance';
import type { Modifier, EquipmentRarity, SlotKind, EquipmentInstance } from '../types';

const SLOTS_PER_RARITY: Record<EquipmentRarity, number> = {
  common: 1, uncommon: 1, rare: 2, epic: 2, legendary: 3, mythic: 4,
};

export function getSlotsCountForRarity(rarity: EquipmentRarity): number {
  return SLOTS_PER_RARITY[rarity];
}

// 풀에서 가중치 무작위 — 중복 없이 N 개
export function rollModifiers(
  rarity: EquipmentRarity,
  slot: SlotKind,
  rng: () => number = Math.random,
): Modifier[] {
  const slotCount = SLOTS_PER_RARITY[rarity];
  const candidates = MODIFIERS.filter(m =>
    m.validSlots.includes(slot) && m.rarityWeight[rarity] > 0
  );
  const result: Modifier[] = [];
  const taken = new Set<string>();
  while (result.length < slotCount && taken.size < candidates.length) {
    const remaining = candidates.filter(m => !taken.has(m.id));
    const totalWeight = remaining.reduce((sum, m) => sum + m.rarityWeight[rarity], 0);
    if (totalWeight === 0) break;
    let pick = rng() * totalWeight;
    for (const m of remaining) {
      pick -= m.rarityWeight[rarity];
      if (pick <= 0) {
        result.push(m);
        taken.add(m.id);
        break;
      }
    }
  }
  return result;
}

export function getModifierMagnitude(modifier: Modifier, instance: EquipmentInstance, rarity: EquipmentRarity): number {
  return modifier.baseValue * enhanceMultiplier(rarity, instance.enhanceLv);
}

export function rerollCost(rerollCountSoFar: number, mode: 'one' | 'all'): { dr: number; stones: number } {
  const baseDR = mode === 'one' ? 25_000_000 : 100_000_000;
  const baseStones = mode === 'one' ? 250 : 1000;
  const mult = Math.pow(1.5, rerollCountSoFar);
  return { dr: Math.floor(baseDR * mult), stones: Math.floor(baseStones * mult) };
}

export function rerollOneSlot(
  instance: EquipmentInstance,
  rarity: EquipmentRarity,
  slot: SlotKind,
  slotIdx: number,
  rng: () => number = Math.random,
): EquipmentInstance {
  const newMods = rollModifiers(rarity, slot, rng);
  return {
    ...instance,
    modifiers: instance.modifiers.map((m, i) => (i === slotIdx ? (newMods[0] ?? m) : m)),
  };
}

export function rerollAllSlots(
  instance: EquipmentInstance,
  rarity: EquipmentRarity,
  slot: SlotKind,
  rng: () => number = Math.random,
): EquipmentInstance {
  return { ...instance, modifiers: rollModifiers(rarity, slot, rng) };
}
