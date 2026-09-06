/**
 * primordialAscension.test.ts — C1127: Unit tests for Primordial Ascension Grand Mastery Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  PRIMORDIAL_NODES,
  getPrimordialNodeDef,
  checkPrimordialUpgrade,
  executePrimordialUpgrade,
  computeCumulativePrimordialBonuses,
  getPrimordialTotalRanks,
  type PrimordialNodeId,
} from './primordialAscension';

describe('C1127: Primordial Ascension Engine Tests', () => {
  it('contains definitions for all 4 primordial nodes', () => {
    const nodes: PrimordialNodeId[] = [
      'primordial_genesis',
      'primordial_annihilation',
      'primordial_eternity',
      'primordial_singularity',
    ];

    for (const id of nodes) {
      const def = getPrimordialNodeDef(id);
      expect(def).toBeDefined();
      expect(def.id).toBe(id);
      expect(def.nameKR.length).toBeGreaterThan(0);
      expect(def.hanja.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
      expect(def.maxRank).toBeGreaterThan(0);
      expect(def.cost(1).essence).toBeGreaterThan(0);
      expect(def.cost(1).shards).toBeGreaterThan(0);
    }
  });

  it('rejects upgrade when essence or shards are insufficient', () => {
    // Insufficient essence
    const checkNoEssence = checkPrimordialUpgrade('primordial_genesis', {}, 0, 500, []);
    expect(checkNoEssence.canUpgrade).toBe(false);
    expect(checkNoEssence.reason).toContain('차원 정수가 부족합니다');

    // Insufficient shards
    const checkNoShards = checkPrimordialUpgrade('primordial_genesis', {}, 5, 50, []);
    expect(checkNoShards.canUpgrade).toBe(false);
    expect(checkNoShards.reason).toContain('별빛 파편이 부족합니다');
  });

  it('enforces sector 5 prerequisite for primordial_singularity node', () => {
    // Sector 5 not cleared
    const checkLocked = checkPrimordialUpgrade('primordial_singularity', {}, 10, 5000, [1, 2, 3, 4]);
    expect(checkLocked.canUpgrade).toBe(false);
    expect(checkLocked.reason).toContain('제5섹터');

    // Sector 5 cleared
    const checkUnlocked = checkPrimordialUpgrade('primordial_singularity', {}, 10, 5000, [1, 2, 3, 4, 5]);
    expect(checkUnlocked.canUpgrade).toBe(true);
  });

  it('prevents upgrade beyond maxRank', () => {
    const checkMax = checkPrimordialUpgrade('primordial_genesis', { primordial_genesis: 5 }, 10, 5000, []);
    expect(checkMax.canUpgrade).toBe(false);
    expect(checkMax.reason).toContain('최대 랭크');
  });

  it('successfully executes upgrade and updates resources and ranks', () => {
    const res = executePrimordialUpgrade('primordial_genesis', {}, 5, 1000, []);
    expect(res.success).toBe(true);
    expect(res.newRanks.primordial_genesis).toBe(1);
    expect(res.remainingEssence).toBe(4); // 5 - 1
    expect(res.remainingShards).toBe(750); // 1000 - 250
  });

  it('computes cumulative primordial bonuses accurately', () => {
    const baseline = computeCumulativePrimordialBonuses({});
    expect(baseline.hpMultiplier).toBe(1.0);
    expect(baseline.finalDmgMultiplier).toBe(1.0);
    expect(baseline.defPierceBonus).toBe(0);
    expect(baseline.maxLevelBonus).toBe(0);

    const fullRank = computeCumulativePrimordialBonuses({
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 5,
      primordial_singularity: 3,
    });

    // genesis: +50% HP, +25% Final Dmg, +500 Max Level
    expect(fullRank.hpMultiplier).toBe(1.50);
    expect(fullRank.finalDmgMultiplier).toBe(1.25);
    expect(fullRank.maxLevelBonus).toBe(500);

    // annihilation: +60% def pierce, +40% elemental affinity
    expect(fullRank.defPierceBonus).toBe(0.60);
    expect(fullRank.elementalAffinityBonus).toBe(0.40);

    // eternity: +15% DR, +50% healing efficacy
    expect(fullRank.damageReductionBonus).toBe(0.15);
    expect(fullRank.healingEfficacyBonus).toBe(0.50);

    // singularity: +30% Def-to-Atk, 3 barrier turns
    expect(fullRank.defToAtkRatio).toBe(0.30);
    expect(fullRank.barrierTurns).toBe(3);
  });

  it('correctly aggregates total awakened primordial ranks', () => {
    expect(getPrimordialTotalRanks({})).toBe(0);
    expect(
      getPrimordialTotalRanks({
        primordial_genesis: 3,
        primordial_annihilation: 2,
        primordial_eternity: 1,
      })
    ).toBe(6);
  });
});
