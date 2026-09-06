/**
 * paradoxSpiral.test.ts — C1165: Unit tests for Paradox Spiral procedural engine.
 */

import { describe, it, expect } from 'vitest';
import {
  checkParadoxEligibility,
  getAnomaliesForFloor,
  generateParadoxGuardian,
  resolveParadoxFloorCombat,
  PARADOX_ANOMALIES,
} from './paradoxSpiral';
import { HeroEntity } from '../hero/HeroEntity';
import { INITIAL_META, type MetaState } from '../store/gameStore';

describe('C1165: Paradox Spiral Procedural Engine Tests', () => {
  it('enforces eligibility requiring either 1 rebirth or 1 pantheon clear', () => {
    const unrankedMeta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 0,
      pantheonClears: 0,
    };
    const check1 = checkParadoxEligibility(unrankedMeta);
    expect(check1.eligible).toBe(false);
    expect(check1.reason).toContain('시공 환생');

    const rebirthMeta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 1,
      pantheonClears: 0,
    };
    expect(checkParadoxEligibility(rebirthMeta).eligible).toBe(true);

    const pantheonMeta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 0,
      pantheonClears: 1,
    };
    expect(checkParadoxEligibility(pantheonMeta).eligible).toBe(true);
  });

  it('assigns progressive paradox anomalies across floor brackets', () => {
    expect(getAnomaliesForFloor(1)).toEqual([]);
    expect(getAnomaliesForFloor(5)).toEqual([]);
    expect(getAnomaliesForFloor(6)).toEqual(['temporal_dilation']);
    expect(getAnomaliesForFloor(15)).toEqual(['temporal_dilation']);
    expect(getAnomaliesForFloor(16)).toEqual(['temporal_dilation', 'gravity_crush']);
    expect(getAnomaliesForFloor(30)).toEqual(['temporal_dilation', 'gravity_crush']);
    expect(getAnomaliesForFloor(31)).toEqual(['temporal_dilation', 'gravity_crush', 'matter_inversion']);
    expect(getAnomaliesForFloor(50)).toEqual(['temporal_dilation', 'gravity_crush', 'matter_inversion']);
    expect(getAnomaliesForFloor(51)).toEqual([
      'temporal_dilation',
      'gravity_crush',
      'matter_inversion',
      'chronos_bleed',
    ]);
    expect(getAnomaliesForFloor(100)).toHaveLength(4);
  });

  it('generates scaling guardian stats and identifies milestone floors', () => {
    const g1 = generateParadoxGuardian(1);
    const g10 = generateParadoxGuardian(10);
    const g50 = generateParadoxGuardian(50);

    expect(g1.floor).toBe(1);
    expect(g1.isMilestoneFloor).toBe(false);
    expect(g1.maxHp).toBeGreaterThanOrEqual(80_000_000);

    expect(g10.floor).toBe(10);
    expect(g10.isMilestoneFloor).toBe(true);
    expect(g10.nameKR).toContain('초시공의 망령');
    expect(g10.maxHp).toBeGreaterThan(g1.maxHp);
    expect(g10.atk).toBeGreaterThan(g1.atk);
    expect(g10.def).toBeGreaterThan(g1.def);

    expect(g50.maxHp).toBeGreaterThan(g10.maxHp);
    expect(g50.isMilestoneFloor).toBe(true);
  });

  it('simulates floor combat granting gold and paradox dust rewards upon victory', () => {
    const hero = HeroEntity.create({
      seed: 42,
      heroHpMax: 10_000_000,
      heroAtkBase: 50_000_000,
      heroDefBase: 10_000_000,
    });

    const meta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 1,
      forgedRegalia: ['ouroboros_chrono_blade', 'ymir_primordial_heart'],
    };

    const result = resolveParadoxFloorCombat(hero, 'fire', 0.20, meta, 1);

    expect(result.floor).toBe(1);
    expect(result.won).toBe(true);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.turns).toBeLessThanOrEqual(50);
    expect(result.totalDamageDealt).toBeGreaterThan(0);
    expect(result.rewards).toBeDefined();
    expect(result.rewards?.goldReward).toBe(10_000_000);
    expect(result.rewards?.paradoxDust).toBe(10);
    expect(result.turnLogs.length).toBe(result.turns);
  });

  it('validates that debuff immunity negates chronos bleed damage', () => {
    const hero = HeroEntity.create({
      seed: 42,
      heroHpMax: 5_000_000,
      heroAtkBase: 50_000_000,
      heroDefBase: 10_000_000,
    });

    // Floor 60 has chronos_bleed
    const withoutImmunityMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: [],
    };

    const result1 = resolveParadoxFloorCombat(hero, 'fire', 0.10, withoutImmunityMeta, 60);
    const bleedTurn1 = result1.turnLogs.find(t => t.bleedDamageTaken > 0);
    expect(bleedTurn1).toBeDefined();

    // With Aion Singularity Aegis (debuff immunity)
    const withImmunityMeta: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['aion_singularity_aegis'],
    };

    const result2 = resolveParadoxFloorCombat(hero, 'fire', 0.10, withImmunityMeta, 60);
    const bleedTurn2 = result2.turnLogs.find(t => t.bleedDamageTaken > 0);
    expect(bleedTurn2).toBeUndefined(); // Bleed is completely negated
  });
});
