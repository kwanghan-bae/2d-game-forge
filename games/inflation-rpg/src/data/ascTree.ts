import type { AscTreeNodeId } from '../types';

export interface AscTreeNodeDef {
  id: AscTreeNodeId;
  name: string;
  description: string;
  effectMagnitude: number;
  maxLevel: number;
}

export const ASC_TREE_NODES: Record<AscTreeNodeId, AscTreeNodeDef> = {
  hp_pct: { id: 'hp_pct', name: '강철의 심장', description: 'HP +5%/lv', effectMagnitude: 0.05, maxLevel: 10 },
  atk_pct: { id: 'atk_pct', name: '분노의 인장', description: 'ATK +5%/lv', effectMagnitude: 0.05, maxLevel: 10 },
  gold_drop: { id: 'gold_drop', name: '황금의 손길', description: '골드 드랍 +10%/lv', effectMagnitude: 0.10, maxLevel: 5 },
  bp_start: { id: 'bp_start', name: '전사의 결의', description: '런 시작 BP +1/lv', effectMagnitude: 1, maxLevel: 5 },
  sp_per_lvl: { id: 'sp_per_lvl', name: '성장의 빛', description: '레벨업 SP +1/lv', effectMagnitude: 1, maxLevel: 4 },
  dungeon_currency: { id: 'dungeon_currency', name: '차원의 보고', description: '던전 화폐 +10%/lv', effectMagnitude: 0.10, maxLevel: 5 },
  crit_damage: { id: 'crit_damage', name: '치명의 일격', description: '크리 데미지 +20%/lv', effectMagnitude: 0.20, maxLevel: 5 },
  asc_accel: { id: 'asc_accel', name: '어센션 가속', description: 'Asc 비용 -10%/lv', effectMagnitude: 0.10, maxLevel: 9 },
  mod_magnitude: { id: 'mod_magnitude', name: '수식의 정수', description: '수식어 magnitude +5%/lv', effectMagnitude: 0.05, maxLevel: 10 },
  effect_proc: { id: 'effect_proc', name: '격발의 손길', description: 'Effect proc 확률 +5%/lv', effectMagnitude: 0.05, maxLevel: 5 },
};

export const ASC_TREE_NODE_IDS: readonly AscTreeNodeId[] = [
  'hp_pct', 'atk_pct', 'gold_drop', 'bp_start', 'sp_per_lvl',
  'dungeon_currency', 'crit_damage', 'asc_accel',
  'mod_magnitude', 'effect_proc',
];

export const EMPTY_ASC_TREE: Record<AscTreeNodeId, number> = {
  hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
  dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
  mod_magnitude: 0, effect_proc: 0,
};

export function nodeCost(currentLv: number): number {
  return currentLv + 1;
}

export function nodeTotalCost(targetLv: number): number {
  return (targetLv * (targetLv + 1)) / 2;
}
