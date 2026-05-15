import type { MetaState, RelicId } from '../types';
import { RELICS, getEffectiveStack } from '../data/relics';

export type FlatMultTarget =
  | 'hp' | 'atk' | 'def' | 'agi' | 'luc'
  | 'critRate' | 'modifier_magnitude';

export type DropKind = 'gold' | 'dr' | 'dungeon_currency';

export function getRelicFlatMult(meta: MetaState, target: FlatMultTarget): number {
  let mult = 1;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'flat_mult_stat') continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    if (eff <= 0) continue;
    const tgt = def.target;
    if (tgt === 'all' || tgt === target) {
      mult *= 1 + def.perStack * eff;
    }
  }
  return mult;
}

export function getRelicDropBonus(meta: MetaState, kind: DropKind): number {
  let bonus = 0;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'drop_mult') continue;
    if (def.target !== kind) continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    bonus += def.perStack * eff;
  }
  return bonus;
}

export function getRelicXpMult(meta: MetaState): number {
  let mult = 1;
  for (const id of Object.keys(meta.relicStacks) as RelicId[]) {
    const def = RELICS[id];
    if (def.effectType !== 'xp_mult') continue;
    const eff = getEffectiveStack(id, meta.relicStacks[id]);
    mult *= 1 + def.perStack * eff;
  }
  return mult;
}

export function getRelicBpMax(meta: MetaState): number {
  const eff = getEffectiveStack('warrior_banner', meta.relicStacks.warrior_banner);
  return eff * RELICS.warrior_banner.perStack;
}

export function getRelicBpFreeChance(meta: MetaState): number {
  const eff = getEffectiveStack('dokkaebi_charm', meta.relicStacks.dokkaebi_charm);
  return eff * RELICS.dokkaebi_charm.perStack;
}

export function relicNoDeathLoss(meta: MetaState): boolean {
  return getEffectiveStack('undead_coin', meta.relicStacks.undead_coin) >= 1;
}

export function relicReviveCount(meta: MetaState): number {
  return getEffectiveStack('feather_of_fate', meta.relicStacks.feather_of_fate);
}

export function applyStackIncrement(meta: MetaState, id: RelicId): MetaState['relicStacks'] {
  const def = RELICS[id];
  const current = meta.relicStacks[id];
  const next = current + 1;
  const effective = (() => {
    if (def.cap.kind === 'infinite') return next;
    if (def.cap.kind === 'binary') return Math.min(next, 1);
    return Math.min(next, def.cap.value);
  })();
  return { ...meta.relicStacks, [id]: effective };
}

export function isAtCap(meta: MetaState, id: RelicId): boolean {
  const def = RELICS[id];
  if (def.cap.kind === 'infinite') return false;
  if (def.cap.kind === 'binary') return meta.relicStacks[id] >= 1;
  return meta.relicStacks[id] >= def.cap.value;
}
