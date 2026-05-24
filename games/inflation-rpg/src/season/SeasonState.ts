import type { SeasonId } from '../types';

export const SEASON_ORDER: readonly SeasonId[] = ['spring', 'summer', 'fall', 'winter'];

export const SEASON_DURATION_YEARS = 15;

export function seasonForAge(age: number): SeasonId {
  const period = SEASON_DURATION_YEARS * 4;
  const ageMod = ((age % period) + period) % period;
  const idx = Math.floor(ageMod / SEASON_DURATION_YEARS);
  return SEASON_ORDER[idx]!;
}

export function seasonNameKR(s: SeasonId): string {
  return ({ spring: '봄', summer: '여름', fall: '가을', winter: '겨울' })[s];
}

export function seasonEmoji(s: SeasonId): string {
  return ({ spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' })[s];
}

/** Phaser background tint colour (0xRRGGBB) per season. */
export function seasonBgTint(s: SeasonId): number {
  return ({
    spring:  0xb0e57c,
    summer:  0xfff5a8,
    fall:    0xffb066,
    winter:  0xc9e3ff,
  })[s];
}

export interface SeasonBonus {
  /** Multiplier applied to hero atk (folded into damping in cycleSliceV2). */
  atkMul: number;
  /** Multiplier applied to drop-chance bonus. */
  dropMul: number;
  /** Multiplier applied to light-emit rate (wired via getLightRateMul in OverworldRunner). */
  lightRateMul: number;
  /** Flat bonus added to field-diff threshold (buff6) for damping calc. */
  dampingThresholdBonus: number;
}

export function seasonBonus(s: SeasonId): SeasonBonus {
  return ({
    spring: { atkMul: 1.0,  dropMul: 1.0,  lightRateMul: 1.1, dampingThresholdBonus: 0 },
    summer: { atkMul: 1.05, dropMul: 1.0,  lightRateMul: 1.0, dampingThresholdBonus: 0 },
    fall:   { atkMul: 1.0,  dropMul: 1.1,  lightRateMul: 1.0, dampingThresholdBonus: 0 },
    winter: { atkMul: 1.0,  dropMul: 1.0,  lightRateMul: 1.0, dampingThresholdBonus: 5 },
  })[s];
}
