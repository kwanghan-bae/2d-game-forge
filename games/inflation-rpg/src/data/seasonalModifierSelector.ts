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

/** Cycle 219 — catalog 의 modifier 총 개수. UI display + invariant test 의 진입점 통일. */
export function getSeasonModifierCount(): number {
  return ALL_SEASON_MODIFIER_IDS.length;
}

/** Cycle 221 — active season 의 한 줄 label string. UI display helper. */
export function formatActiveSeasonLabel(seasonStartedAt: number, nowMs?: number): string {
  const def = getActiveSeasonModifier(seasonStartedAt, nowMs);
  return `✨ ${def.nameKR}`;
}

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

/**
 * Cycle 172 — 다음 시즌 회전까지 남은 ms.
 * `(slot + 1) * SEASON_ROTATION_MS - elapsed`. clamp 0 이상.
 * UI 의 sp-active-season chip 에 "남은 N 일" 등으로 wire 예정 (cycle 173+).
 */
export function getSeasonTimeRemainingMs(
  seasonStartedAt: number,
  nowMs?: number,
): number {
  const at = typeof nowMs === 'number' ? nowMs : Date.now();
  const elapsed = Math.max(0, at - (seasonStartedAt ?? 0));
  const slot = Math.floor(elapsed / SEASON_ROTATION_MS);
  const nextRotationAt = (slot + 1) * SEASON_ROTATION_MS;
  return Math.max(0, nextRotationAt - elapsed);
}

/** ms → 일 (floor). 0.5 일 미만 = 0 일 (UI 표시 시 "오늘" 표기 호환). */
export function msToDays(ms: number): number {
  return Math.floor(ms / (24 * 3600 * 1000));
}

/**
 * Cycle 197 — active SeasonModifier 의 narrativeWeightMul 추출. cycle 187 의
 *  SeasonPassScreen.handleClaim inline 로직의 캡슐화. 없으면 null.
 */
export function getActiveNarrativeWeights(
  seasonStartedAt: number,
  nowMs?: number,
): Readonly<Record<string, number>> | null {
  const def = getActiveSeasonModifier(seasonStartedAt, nowMs);
  return def.applyRule.narrativeWeightMul ?? null;
}

/**
 * Cycle 209 — active SeasonModifier 의 traitWeightMul 추출 (narrative 와 대칭).
 *  HeroDecisionAI mega-phase (cycle 156 carry-over) 진입 시 wire 진입점.
 */
export function getActiveTraitWeights(
  seasonStartedAt: number,
  nowMs?: number,
): Readonly<Record<string, number>> | null {
  const def = getActiveSeasonModifier(seasonStartedAt, nowMs);
  return def.applyRule.traitWeightMul ?? null;
}

/**
 * Cycle 216 — active SeasonModifier 의 buffCardWeightMul 추출 (3 axis 대칭).
 *  legendary-buff-card-bias (cycle 129) 의 wire 진입점.
 */
export function getActiveBuffCardWeights(
  seasonStartedAt: number,
  nowMs?: number,
): Readonly<Record<string, number>> | null {
  const def = getActiveSeasonModifier(seasonStartedAt, nowMs);
  return def.applyRule.buffCardWeightMul ?? null;
}

/**
 * Cycle 159 — active SeasonModifier 의 realm 별 cosmetic tint token lookup.
 * cycle 155 의 `getCosmeticTint(rule, realmId)` 를 selector 진입점으로 노출.
 * realm 의 sprite/배경 tint 적용 site (cycle 167+ OverworldScene wire 예정)
 * 가 useGameStore 의 `seasonStartedAt` 만으로 호출 가능하도록.
 *
 * 반환 = tint token (예: 'spring-pastel', 'aqua-deep') 또는 null (미매칭).
 * token → CSS 색 / Phaser tint 매핑은 consumer 책임 (분리 keep).
 */
export function getActiveCosmeticTint(
  seasonStartedAt: number,
  realmId: string,
  nowMs?: number,
): string | null {
  const def = getActiveSeasonModifier(seasonStartedAt, nowMs);
  return def.applyRule.cosmeticTint?.[realmId] ?? null;
}
