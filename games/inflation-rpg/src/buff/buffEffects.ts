import type { MetaState } from '../types';

function lvOf(meta: MetaState, id: string): number {
  return meta.buffLevels?.[id as keyof MetaState['buffLevels']] ?? 0;
}

/** 1.0 + 0.005 * lv. No cap. */
export function getMoveSpeedMul(meta: MetaState): number {
  return 1.0 + lvOf(meta, 'move_speed') * 0.005;
}

/** 0.003 * lv (additive bonus to drop chance). No cap. */
export function getDropChanceBonus(meta: MetaState): number {
  return lvOf(meta, 'drop_chance') * 0.003;
}

/** 1.0 + 0.01 * lv. No cap. */
export function getLightRateMul(meta: MetaState): number {
  return 1.0 + lvOf(meta, 'light_rate') * 0.01;
}

/** 0.05 * lv, capped at 0.80. */
export function getRejuvDiscount(meta: MetaState): number {
  return Math.min(0.80, lvOf(meta, 'rejuv_discount') * 0.05);
}

/** 1.0 - 0.01 * lv, floored at 0.50. */
export function getAgingSpeedMul(meta: MetaState): number {
  return Math.max(0.50, 1.0 - lvOf(meta, 'aging_slow') * 0.01);
}

/** 1 * lv. V3-C 에서는 unwired (V3-D 의 zone field level damping 이 consume). */
export function getFieldDiffThreshold(meta: MetaState): number {
  return lvOf(meta, 'field_diff');
}
