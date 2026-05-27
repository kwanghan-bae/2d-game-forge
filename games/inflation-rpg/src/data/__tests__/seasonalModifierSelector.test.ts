// Cycle 135 — SeasonalModifier active selector unit test.

import { describe, expect, it } from 'vitest';
import {
  getActiveSeasonModifierId,
  getActiveSeasonModifier,
  getActiveCosmeticTint,
  getSeasonTimeRemainingMs,
  msToDays,
  SEASON_ROTATION_MS,
} from '../seasonalModifierSelector';
import { ALL_SEASON_MODIFIER_IDS, SEASON_MODIFIER_CATALOG } from '../seasonalModifierCatalog';

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

  /** Cycle 159 — getActiveCosmeticTint selector */
  describe('Cycle 159 — getActiveCosmeticTint', () => {
    /** catalog 의 cosmeticTint 매핑이 있는 slot 을 검색 */
    const tintSlotIdx = ALL_SEASON_MODIFIER_IDS.findIndex((id) => {
      const def = SEASON_MODIFIER_CATALOG[id];
      return def.applyRule.cosmeticTint !== undefined;
    });

    it('cosmeticTint 정의된 slot 의 매칭 realm → token 반환', () => {
      // 해당 slot 의 def 직접 lookup 으로 realm/token 확보 (test 가 catalog 변경에 견고).
      const def = SEASON_MODIFIER_CATALOG[ALL_SEASON_MODIFIER_IDS[tintSlotIdx]];
      const realmId = Object.keys(def.applyRule.cosmeticTint!)[0];
      const expectedToken = def.applyRule.cosmeticTint![realmId];
      const at = SEASON_ROTATION_MS * tintSlotIdx;
      expect(getActiveCosmeticTint(0, realmId, at)).toBe(expectedToken);
    });

    it('매칭되지 않는 realm → null', () => {
      expect(getActiveCosmeticTint(0, 'realm-that-does-not-exist', 0)).toBeNull();
    });

    it('cosmeticTint 부재인 slot → null', () => {
      // 첫 catalog (spring) 는 plains+field 매칭. sea/chaos 등 다른 realm 은 null.
      expect(getActiveCosmeticTint(0, 'volcano', 0)).toBeNull();
    });
  });

  /** Cycle 172 — getSeasonTimeRemainingMs + msToDays */
  describe('Cycle 172 — season 카운트다운 selector', () => {
    it('seasonStartedAt = 0, now = 0 → 30 일 전체', () => {
      expect(getSeasonTimeRemainingMs(0, 0)).toBe(SEASON_ROTATION_MS);
    });

    it('elapsed = SEASON_ROTATION / 2 → SEASON_ROTATION / 2 남음', () => {
      const halfWay = SEASON_ROTATION_MS / 2;
      expect(getSeasonTimeRemainingMs(0, halfWay)).toBe(halfWay);
    });

    it('elapsed = SEASON_ROTATION → 다음 시즌 시작 즉시, 30 일 남음', () => {
      // slot 1 시작점, (1+1) * MS - SEASON_ROTATION = SEASON_ROTATION 남음.
      expect(getSeasonTimeRemainingMs(0, SEASON_ROTATION_MS)).toBe(SEASON_ROTATION_MS);
    });

    it('clamp — now < seasonStartedAt → 30 일 남음 (음수 elapsed clamp)', () => {
      expect(getSeasonTimeRemainingMs(1000, 500)).toBe(SEASON_ROTATION_MS);
    });

    it('msToDays — 1 day = 1', () => {
      expect(msToDays(24 * 3600 * 1000)).toBe(1);
      expect(msToDays(0)).toBe(0);
      expect(msToDays(SEASON_ROTATION_MS)).toBe(30);
      // 0.5 일 → 0 (floor)
      expect(msToDays(12 * 3600 * 1000)).toBe(0);
    });
  });
});
