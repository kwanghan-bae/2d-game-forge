import { describe, it, expect } from 'vitest';
import {
  computeAstralResonance,
  evaluateDimensionalEvasion,
} from './astralResonanceMatrix';
import type { EquipmentInstance } from '../types';

describe('astralResonanceMatrix engine (C1120)', () => {
  const createItem = (id: string, affix?: import('./cosmicInfusion').CosmicAffixType): EquipmentInstance => ({
    instanceId: id,
    baseId: 'gear-' + id,
    enhanceLv: 10,
    modifiers: [],
    cosmicAffix: affix,
  });

  it('evaluates Tier 0 (inactive) when fewer than 2 distinct affixes are equipped', () => {
    // No affixes
    const state0 = computeAstralResonance([createItem('1'), createItem('2')]);
    expect(state0.harmonyTier).toBe(0);
    expect(state0.tierNameKR).toBe('공명 비활성');
    expect(state0.omniStatMultiplier).toBe(1.0);

    // 1 affix
    const state1 = computeAstralResonance([createItem('1', 'celestial_sharpness')]);
    expect(state1.harmonyTier).toBe(0);

    // 2 identical affixes
    const stateIdentical = computeAstralResonance([
      createItem('1', 'celestial_sharpness'),
      createItem('2', 'celestial_sharpness'),
    ]);
    expect(stateIdentical.harmonyTier).toBe(0);
  });

  it('evaluates Tier 1 (Dual Harmony) when 2 distinct affixes are equipped', () => {
    const stateDual = computeAstralResonance([
      createItem('1', 'celestial_sharpness'),
      createItem('2', 'astral_fortitude'),
    ]);

    expect(stateDual.harmonyTier).toBe(1);
    expect(stateDual.tierNameKR).toContain('이원성 성간 조화');
    expect(stateDual.omniStatMultiplier).toBe(1.05);
    expect(stateDual.defPierceBonus).toBe(0.05);
    expect(stateDual.finalDmgMultiplier).toBe(1.0);
    expect(stateDual.dimensionalEvasionChance).toBe(0);
  });

  it('evaluates Tier 2 (Trinity Harmony) when 3 distinct affixes are equipped', () => {
    const stateTrinity = computeAstralResonance([
      createItem('1', 'celestial_sharpness'),
      createItem('2', 'astral_fortitude'),
      createItem('3', 'singularity_might'),
    ]);

    expect(stateTrinity.harmonyTier).toBe(2);
    expect(stateTrinity.tierNameKR).toContain('삼위일체 성간 조화');
    expect(stateTrinity.omniStatMultiplier).toBe(1.10);
    expect(stateTrinity.defPierceBonus).toBe(0.10);
    expect(stateTrinity.finalDmgMultiplier).toBe(1.10);
    expect(stateTrinity.elementalBonus).toBe(0.10);
    expect(stateTrinity.dimensionalEvasionChance).toBe(0.10);
  });

  describe('evaluateDimensionalEvasion', () => {
    it('returns true when roll is within evasion chance and false otherwise', () => {
      const stateTrinity = computeAstralResonance([
        createItem('1', 'celestial_sharpness'),
        createItem('2', 'astral_fortitude'),
        createItem('3', 'singularity_might'),
      ]);

      expect(evaluateDimensionalEvasion(stateTrinity, 0.05)).toBe(true);
      expect(evaluateDimensionalEvasion(stateTrinity, 0.09)).toBe(true);
      expect(evaluateDimensionalEvasion(stateTrinity, 0.10)).toBe(false);
      expect(evaluateDimensionalEvasion(stateTrinity, 0.50)).toBe(false);

      // Inactive state has 0% evasion
      const state0 = computeAstralResonance([]);
      expect(evaluateDimensionalEvasion(state0, 0.01)).toBe(false);
    });
  });
});
