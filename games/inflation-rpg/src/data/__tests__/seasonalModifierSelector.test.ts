// Cycle 135 — SeasonalModifier active selector unit test.

import { describe, expect, it } from 'vitest';
import {
  getActiveSeasonModifierId,
  getActiveSeasonModifier,
  SEASON_ROTATION_MS,
} from '../seasonalModifierSelector';
import { ALL_SEASON_MODIFIER_IDS } from '../seasonalModifierCatalog';

describe('Cycle 135 — seasonalModifierSelector', () => {
  it('seasonStartedAt = 0, nowMs = 0 → 첫 modifier', () => {
    expect(getActiveSeasonModifierId(0, 0)).toBe(ALL_SEASON_MODIFIER_IDS[0]);
  });

  it('30 일 후 → 두 번째 modifier', () => {
    expect(getActiveSeasonModifierId(0, SEASON_ROTATION_MS)).toBe(ALL_SEASON_MODIFIER_IDS[1]);
  });

  it('카탈로그 길이 × 30 일 후 → 다시 첫 modifier (rotation)', () => {
    const fullCycle = SEASON_ROTATION_MS * ALL_SEASON_MODIFIER_IDS.length;
    expect(getActiveSeasonModifierId(0, fullCycle)).toBe(ALL_SEASON_MODIFIER_IDS[0]);
  });

  it('seasonStartedAt 양수 — elapsed 기준 회전', () => {
    const start = 1_700_000_000_000;
    expect(getActiveSeasonModifierId(start, start)).toBe(ALL_SEASON_MODIFIER_IDS[0]);
    expect(getActiveSeasonModifierId(start, start + SEASON_ROTATION_MS * 2)).toBe(ALL_SEASON_MODIFIER_IDS[2]);
  });

  it('nowMs < seasonStartedAt → 첫 modifier (clamp)', () => {
    // 음수 elapsed → Math.max(0, ...) clamp → slot 0 → first id.
    expect(getActiveSeasonModifierId(1000, 500)).toBe(ALL_SEASON_MODIFIER_IDS[0]);
  });

  it('getActiveSeasonModifier — def lookup wrapper', () => {
    const def = getActiveSeasonModifier(0, 0);
    expect(def.id).toBe(ALL_SEASON_MODIFIER_IDS[0]);
    expect(def.nameKR.length).toBeGreaterThan(0);
  });
});
