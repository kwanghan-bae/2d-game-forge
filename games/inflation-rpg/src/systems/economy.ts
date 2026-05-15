import type { MetaState, AscTreeNodeId } from '../types';
import { getMythicDropBonus } from './mythics';
import { getRelicDropBonus } from './relics';

// Phase G — drop multiplier helper (per-lv scaling; dungeon-level OR ascTree node)
export function applyDropMult(amount: number, perLv: number, lv: number): number {
  if (lv <= 0) return amount;
  return Math.floor(amount * (1 + perLv * lv));
}

// Phase E — aggregate meta-driven drop bonuses (ascTree + mythic + relic)
export type MetaDropKind = 'gold' | 'dr' | 'dungeon_currency';

interface AscDropConf { node: AscTreeNodeId | null; perLv: number }
const ASC_TREE_DROP_PER_LV: Record<MetaDropKind, AscDropConf> = {
  gold:             { node: 'gold_drop',        perLv: 0.10 },
  dr:               { node: null,                perLv: 0 },     // no asc-tree node for DR drop
  dungeon_currency: { node: 'dungeon_currency', perLv: 0.10 },
};

export function applyMetaDropMult(base: number, kind: MetaDropKind, meta: MetaState): number {
  const ascConf = ASC_TREE_DROP_PER_LV[kind];
  const ascLv = ascConf.node ? (meta.ascTree[ascConf.node] ?? 0) : 0;
  const ascBonus = ascConf.perLv * ascLv;
  const mythicBonus = getMythicDropBonus(meta, kind);
  const relicBonus  = getRelicDropBonus(meta, kind);
  const totalMult = 1 + ascBonus + mythicBonus + relicBonus;
  return Math.floor(base * totalMult);
}
