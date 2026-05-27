// Cycle 155 — seasonalModifierApply pure consumer unit test.

import { describe, expect, it } from 'vitest';
import {
  getTraitWeightMul,
  getNarrativeWeightMul,
  getCosmeticTint,
  isModifierActive,
} from '../seasonalModifierApply';
import { SEASON_MODIFIER_CATALOG } from '../seasonalModifierCatalog';

describe('Cycle 155 — seasonalModifierApply', () => {
  it('getTraitWeightMul — exact match', () => {
    const rule = { traitWeightMul: { fire_burst: 2 } };
    expect(getTraitWeightMul(rule, 'fire_burst')).toBe(2);
    expect(getTraitWeightMul(rule, 'water_flow')).toBe(1);
  });

  it('getTraitWeightMul — wildcard prefix match', () => {
    const rule = { traitWeightMul: { 'fire_*': 2 } };
    expect(getTraitWeightMul(rule, 'fire_burst')).toBe(2);
    expect(getTraitWeightMul(rule, 'fire_drain')).toBe(2);
    expect(getTraitWeightMul(rule, 'water_flow')).toBe(1);
    expect(getTraitWeightMul(rule, 'fire')).toBe(1);  // 'fire' 는 'fire_' 로 시작 안 함 → 매칭 없음
  });

  it('getTraitWeightMul — exact 우선 over wildcard', () => {
    const rule = { traitWeightMul: { 'fire_*': 2, fire_burst: 5 } };
    expect(getTraitWeightMul(rule, 'fire_burst')).toBe(5);
    expect(getTraitWeightMul(rule, 'fire_other')).toBe(2);
  });

  it('getTraitWeightMul — rule undefined → 1', () => {
    expect(getTraitWeightMul({}, 'any_trait')).toBe(1);
  });

  it('getNarrativeWeightMul — exact match', () => {
    const rule = { narrativeWeightMul: { elegy: 1.5 } };
    expect(getNarrativeWeightMul(rule, 'elegy')).toBe(1.5);
    expect(getNarrativeWeightMul(rule, 'comedy')).toBe(1);
  });

  it('getCosmeticTint — realm match / 미매칭 null', () => {
    const rule = { cosmeticTint: { sea: 'aqua-deep', volcano: 'fire-glow' } };
    expect(getCosmeticTint(rule, 'sea')).toBe('aqua-deep');
    expect(getCosmeticTint(rule, 'volcano')).toBe('fire-glow');
    expect(getCosmeticTint(rule, 'plains')).toBeNull();
  });

  it('isModifierActive — def 존재 시 true', () => {
    expect(isModifierActive(SEASON_MODIFIER_CATALOG['volcano-fire-trait-boost'])).toBe(true);
    expect(isModifierActive(undefined)).toBe(false);
  });
});
