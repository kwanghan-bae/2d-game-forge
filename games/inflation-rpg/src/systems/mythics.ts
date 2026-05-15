import type { MetaState, MythicId } from '../types';
import { MYTHICS } from '../data/mythics';
import type { FlatMultTarget, DropKind } from './relics';

export type SkillKind = 'base' | 'ult';

export function getEquippedMythics(meta: MetaState): MythicId[] {
  return meta.mythicEquipped.filter((id): id is MythicId => id !== null);
}

export function getMythicFlatMult(
  meta: MetaState,
  target: FlatMultTarget | string,
): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'flat_mult') continue;
    if (def.target === 'all' || def.target === target) {
      mult *= 1 + def.value;
    }
  }
  return mult;
}

export function getMythicCooldownMult(meta: MetaState, _kind: SkillKind): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'cooldown_mult') continue;
    // value is negative (-0.3 = -30%); apply as (1 + value)
    mult *= 1 + def.value;
  }
  return Math.max(0.4, mult);
}

export function getMythicDropBonus(meta: MetaState, kind: DropKind): number {
  let bonus = 0;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'drop_mult') continue;
    if (def.target === 'all_kinds' || def.target === kind) {
      bonus += def.value;
    }
  }
  return bonus;
}

export function getMythicXpMult(meta: MetaState): number {
  let mult = 1;
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'xp_mult') continue;
    mult *= 1 + def.value;
  }
  return mult;
}

export function hasMythicPassive(meta: MetaState, key: 'revive'): boolean {
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'passive') continue;
    if (key === 'revive' && id === 'phoenix_feather') return true;
  }
  return false;
}

export function getMythicReviveCount(meta: MetaState): number {
  return hasMythicPassive(meta, 'revive') ? 1 : 0;
}

export interface MythicProc {
  trigger: 'on_player_hit_received' | 'on_player_attack';
  effect: 'lifesteal' | 'thorns' | 'sp_steal' | 'magic_burst';
  value: number;
}

export function getMythicProcs(meta: MetaState): MythicProc[] {
  const procs: MythicProc[] = [];
  for (const id of getEquippedMythics(meta)) {
    const def = MYTHICS[id];
    if (def.effectType !== 'proc') continue;
    if (!def.procTrigger || !def.procEffect) continue;
    procs.push({ trigger: def.procTrigger, effect: def.procEffect, value: def.value });
  }
  return procs;
}

export function equipMythic(meta: MetaState, slotIndex: number, mythicId: MythicId): MetaState {
  if (slotIndex < 0 || slotIndex >= meta.mythicSlotCap) {
    throw new Error(`slot ${slotIndex} out of range (cap ${meta.mythicSlotCap})`);
  }
  if (!meta.mythicOwned.includes(mythicId)) {
    throw new Error(`mythic ${mythicId} not owned`);
  }
  if (meta.mythicEquipped.includes(mythicId)) {
    throw new Error(`${mythicId} already equipped in another slot`);
  }
  const next = [...meta.mythicEquipped];
  next[slotIndex] = mythicId;
  return { ...meta, mythicEquipped: next };
}

export function unequipMythic(meta: MetaState, slotIndex: number): MetaState {
  const next = [...meta.mythicEquipped];
  next[slotIndex] = null;
  return { ...meta, mythicEquipped: next };
}
