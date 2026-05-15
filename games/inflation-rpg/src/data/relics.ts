import type { RelicId } from '../types';

export type RelicCapKind = 'infinite' | 'stacks' | 'binary' | 'per_run';

export interface RelicDef {
  id: RelicId;
  nameKR: string;
  emoji: string;
  descriptionKR: string;
  // Effect routing
  effectType:
    | 'flat_mult_stat'        // fate_dice (luc), moonlight (all), eagle (critRate)
    | 'drop_mult'             // gold_coin, sands_of_time
    | 'xp_mult'               // soul_pearl
    | 'passive_bp_max'        // warrior_banner
    | 'passive_bp_free'       // dokkaebi_charm
    | 'passive_no_death_loss' // undead_coin
    | 'passive_revive';       // feather_of_fate
  perStack: number;           // numeric magnitude per stack
  target?: string;            // stat target if relevant (e.g., 'luc', 'all', 'critRate', 'gold', 'dr')
  cap: { kind: RelicCapKind; value: number };
}

export const RELICS: Record<RelicId, RelicDef> = {
  warrior_banner: {
    id: 'warrior_banner', nameKR: '전사의 깃발', emoji: '⚔️',
    descriptionKR: 'BP 최대 +1 / stack',
    effectType: 'passive_bp_max', perStack: 1,
    cap: { kind: 'infinite', value: Infinity },
  },
  dokkaebi_charm: {
    id: 'dokkaebi_charm', nameKR: '도깨비 부적', emoji: '🎭',
    descriptionKR: 'BP 무소모 +0.1% / stack (cap 50%)',
    effectType: 'passive_bp_free', perStack: 0.001,
    cap: { kind: 'stacks', value: 500 },
  },
  gold_coin: {
    id: 'gold_coin', nameKR: '황금 동전', emoji: '🥇',
    descriptionKR: '골드 +1% / stack',
    effectType: 'drop_mult', perStack: 0.01, target: 'gold',
    cap: { kind: 'infinite', value: Infinity },
  },
  soul_pearl: {
    id: 'soul_pearl', nameKR: '영혼 진주', emoji: '🔮',
    descriptionKR: '캐릭터 XP +1% / stack',
    effectType: 'xp_mult', perStack: 0.01,
    cap: { kind: 'infinite', value: Infinity },
  },
  sands_of_time: {
    id: 'sands_of_time', nameKR: '시간 모래', emoji: '⏳',
    descriptionKR: 'DR 드랍 +1% / stack',
    effectType: 'drop_mult', perStack: 0.01, target: 'dr',
    cap: { kind: 'infinite', value: Infinity },
  },
  fate_dice: {
    id: 'fate_dice', nameKR: '운명 주사위', emoji: '🎲',
    descriptionKR: 'LUC +1% / stack (cap 100%)',
    effectType: 'flat_mult_stat', perStack: 0.01, target: 'luc',
    cap: { kind: 'stacks', value: 100 },
  },
  moonlight_amulet: {
    id: 'moonlight_amulet', nameKR: '월광 부적', emoji: '🌙',
    descriptionKR: '모든 stat +0.5% / stack (cap 200%)',
    effectType: 'flat_mult_stat', perStack: 0.005, target: 'all',
    cap: { kind: 'stacks', value: 400 },
  },
  eagle_arrow: {
    id: 'eagle_arrow', nameKR: '명궁의 화살', emoji: '🏹',
    descriptionKR: '크리율 +0.05% / stack (cap 25%)',
    effectType: 'flat_mult_stat', perStack: 0.0005, target: 'critRate',
    cap: { kind: 'stacks', value: 500 },
  },
  undead_coin: {
    id: 'undead_coin', nameKR: '망자의 동전', emoji: '💀',
    descriptionKR: '사망 시 손실 무효 (1 stack 부터)',
    effectType: 'passive_no_death_loss', perStack: 1,
    cap: { kind: 'binary', value: 1 },
  },
  feather_of_fate: {
    id: 'feather_of_fate', nameKR: '명운의 깃털', emoji: '🪶',
    descriptionKR: '첫 사망 1회 부활 / stack (cap 5)',
    effectType: 'passive_revive', perStack: 1,
    cap: { kind: 'per_run', value: 5 },
  },
};

export const ALL_RELIC_IDS: RelicId[] = Object.keys(RELICS) as RelicId[];

export const EMPTY_RELIC_STACKS: Record<RelicId, number> = {
  warrior_banner: 0, dokkaebi_charm: 0, gold_coin: 0, soul_pearl: 0,
  sands_of_time: 0, fate_dice: 0, moonlight_amulet: 0, eagle_arrow: 0,
  undead_coin: 0, feather_of_fate: 0,
};

export function getEffectiveStack(relicId: RelicId, rawStack: number): number {
  const def = RELICS[relicId];
  if (def.cap.kind === 'infinite') return rawStack;
  if (def.cap.kind === 'binary') return Math.min(rawStack, 1);
  return Math.min(rawStack, def.cap.value);
}
