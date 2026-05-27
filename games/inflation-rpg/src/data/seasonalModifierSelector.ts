// Cycle 135 — N5 SeasonalModifier active selector.
// cycle 129 의 5 starter 카탈로그 + `meta.seasonStartedAt` 의 wire-up. 30-day
// rotation 의 pure helper. cycle 136+ UI 회전에서 SeasonPassScreen header
// 또는 toast 에 active modifier 표시.

import {
  ALL_SEASON_MODIFIER_IDS,
  SEASON_MODIFIER_CATALOG,
} from './seasonalModifierCatalog';
import type {
  SeasonModifierDef,
  SeasonModifierId,
} from './seasonalModifierTypes';

/** 30 일 ms. exported for test 결정성. */
export const SEASON_ROTATION_MS = 30 * 24 * 3600 * 1000;

/**
 * 현재 active SeasonModifier 의 id. seasonStartedAt = 0 이면 epoch 기준
 * (legacy save 의 default). nowMs 미지정 시 Date.now().
 *
 * 30 일마다 카탈로그 순서대로 회전. 카탈로그 변경 시 회전 위치 보존되도록
 * id 가 아닌 index modulo 로 결정.
 */
export function getActiveSeasonModifierId(
  seasonStartedAt: number,
  nowMs?: number,
): SeasonModifierId {
  const at = typeof nowMs === 'number' ? nowMs : Date.now();
  const elapsed = Math.max(0, at - (seasonStartedAt ?? 0));
  const slot = Math.floor(elapsed / SEASON_ROTATION_MS);
  const idx = ((slot % ALL_SEASON_MODIFIER_IDS.length) + ALL_SEASON_MODIFIER_IDS.length) % ALL_SEASON_MODIFIER_IDS.length;
  return ALL_SEASON_MODIFIER_IDS[idx];
}

/** 현재 active SeasonModifier 의 def. lookup wrapper. */
export function getActiveSeasonModifier(
  seasonStartedAt: number,
  nowMs?: number,
): SeasonModifierDef {
  return SEASON_MODIFIER_CATALOG[getActiveSeasonModifierId(seasonStartedAt, nowMs)];
}
