/**
 * riftRecordStorage.test.ts — C1084: Rift Record Storage & Honor Rating Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialRiftRecord,
  updateRiftRecordOnClear,
  updateRiftRecordOnExpedition,
  computeRiftHonorRating,
  type RiftHistoricalRecord,
} from './riftRecordStorage';
import type { RiftCombatResult, RiftExpeditionResult } from './endlessChaosRift';

describe('C1084 [system]: Rift Record Storage & Honor Rating Engine', () => {
  it('creates empty initial record with zeroes', () => {
    const record = createInitialRiftRecord();
    expect(record.highestDepth).toBe(0);
    expect(record.totalGuardiansDefeated).toBe(0);
    expect(record.totalShardsHarvested).toBe(0);
    expect(record.totalCrackStonesHarvested).toBe(0);
    expect(record.totalGoldHarvested).toBe(0);
    expect(record.expeditionsCount).toBe(0);
  });

  it('updates record upon single depth clear', () => {
    const initial = createInitialRiftRecord();
    const combatRes: RiftCombatResult = {
      cleared: true,
      depth: 5,
      monsterName: '혼돈의 침식마수',
      element: 'fire',
      turns: 2,
      damageDealt: 1500000,
      damageTaken: 20000,
      heroRemainingHp: 980000,
      rewards: {
        shards: 25,
        crackStones: 3,
        gold: 250000,
      },
    };

    const updated = updateRiftRecordOnClear(initial, combatRes);
    expect(updated.highestDepth).toBe(5);
    expect(updated.totalGuardiansDefeated).toBe(1);
    expect(updated.totalShardsHarvested).toBe(25);
    expect(updated.totalCrackStonesHarvested).toBe(3);
    expect(updated.totalGoldHarvested).toBe(250000);
    expect(updated.lastExpeditionTimestamp).toBeDefined();
  });

  it('does not mutate stats when combat ends in defeat', () => {
    const initial = createInitialRiftRecord();
    const failCombat: RiftCombatResult = {
      cleared: false,
      depth: 30,
      monsterName: '멸망패왕',
      element: 'dark',
      turns: 8,
      damageDealt: 20000000,
      damageTaken: 1500000,
      heroRemainingHp: 0,
    };

    const updated = updateRiftRecordOnClear(initial, failCombat);
    expect(updated.highestDepth).toBe(0);
    expect(updated.totalGuardiansDefeated).toBe(0);
  });

  it('accumulates multi-depth expedition results and increments expedition count', () => {
    const initial = createInitialRiftRecord();
    const expResult: RiftExpeditionResult = {
      startDepth: 1,
      highestDepthCleared: 10,
      totalDepthsCleared: 10,
      totalTurns: 15,
      totalDamageTaken: 150000,
      heroFinalHp: 800000,
      totalRewards: {
        shards: 265,
        crackStones: 35,
        gold: 2750000,
      },
      battleLog: [],
    };

    const updated = updateRiftRecordOnExpedition(initial, expResult);
    expect(updated.highestDepth).toBe(10);
    expect(updated.totalGuardiansDefeated).toBe(10);
    expect(updated.totalShardsHarvested).toBe(265);
    expect(updated.totalCrackStonesHarvested).toBe(35);
    expect(updated.totalGoldHarvested).toBe(2750000);
    expect(updated.expeditionsCount).toBe(1);
  });

  it('computes composite honor rating, grades, and titles accurately', () => {
    // Initial rank D
    const dRating = computeRiftHonorRating(createInitialRiftRecord());
    expect(dRating.grade).toBe('D');
    expect(dRating.title).toBe('미답의 방랑자');

    // Depth 10 -> Rank A
    const aRecord: RiftHistoricalRecord = {
      highestDepth: 10,
      totalGuardiansDefeated: 10,
      totalShardsHarvested: 265,
      totalCrackStonesHarvested: 35,
      totalGoldHarvested: 2750000,
      expeditionsCount: 1,
    };
    const aRating = computeRiftHonorRating(aRecord);
    expect(aRating.grade).toBe('A');
    expect(aRating.title).toBe('균열의 탐색자');

    // Depth 25 -> Rank SS
    const ssRecord: RiftHistoricalRecord = {
      highestDepth: 25,
      totalGuardiansDefeated: 25,
      totalShardsHarvested: 1000,
      totalCrackStonesHarvested: 150,
      totalGoldHarvested: 10000000,
      expeditionsCount: 3,
    };
    const ssRating = computeRiftHonorRating(ssRecord);
    expect(ssRating.grade).toBe('SS');
    expect(ssRating.title).toBe('차원 절단자');

    // Depth 50 -> Rank ZENITH
    const zenithRecord: RiftHistoricalRecord = {
      highestDepth: 50,
      totalGuardiansDefeated: 100,
      totalShardsHarvested: 5000,
      totalCrackStonesHarvested: 800,
      totalGoldHarvested: 50000000,
      expeditionsCount: 10,
    };
    const zenithRating = computeRiftHonorRating(zenithRecord);
    expect(zenithRating.grade).toBe('ZENITH');
    expect(zenithRating.title).toBe('무극의 초월자');
    expect(zenithRating.badge).toBe('👑🌌');
  });
});
