/**
 * pantheonIntegration.test.ts — C1157: Unit tests for Pantheon Crests & Omniverse Sovereign Title.
 */

import { describe, it, expect } from 'vitest';
import {
  applyPantheonVictory,
  hasOmniverseSovereignTitle,
  getOmniverseSovereignPerks,
  recordPantheonSaga,
} from './pantheonIntegration';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';
import type { PantheonFullRaidResult } from './pantheonRaid';

describe('C1157: Pantheon Integration Tests', () => {
  const mockWinResult: PantheonFullRaidResult = {
    won: true,
    phasesCleared: 4,
    totalDamageDealt: 5_500_000_000,
    totalDamageTaken: 120_000_000,
    totalTurns: 42,
    phaseResults: [],
    rewards: {
      pantheonCrests: 5,
      goldReward: 500_000_000,
      titleKR: '진 우주 주재신 (True Omniverse Sovereign)',
    },
  };

  const mockLossResult: PantheonFullRaidResult = {
    won: false,
    phasesCleared: 2,
    totalDamageDealt: 1_500_000_000,
    totalDamageTaken: 200_000_000,
    totalTurns: 25,
    phaseResults: [],
  };

  it('updates MetaState with clears count, crests, and highest phase upon victory', () => {
    const updatedMeta = applyPantheonVictory(INITIAL_META, mockWinResult);

    expect((updatedMeta as any).pantheonClears).toBe(1);
    expect((updatedMeta as any).pantheonCrests).toBe(5);
    expect((updatedMeta as any).pantheonHighestPhase).toBe(4);
  });

  it('does not mutate MetaState if raid was not won', () => {
    const untouched = applyPantheonVictory(INITIAL_META, mockLossResult);
    expect((untouched as any).pantheonClears ?? 0).toBe(0);
    expect((untouched as any).pantheonCrests ?? 0).toBe(0);
  });

  it('evaluates title unlock status based on clears count', () => {
    expect(hasOmniverseSovereignTitle(INITIAL_META)).toBe(false);

    const metaCleared: MetaState = { ...INITIAL_META, pantheonClears: 1 };
    expect(hasOmniverseSovereignTitle(metaCleared)).toBe(true);
  });

  it('evaluates global prestige perks for Omniverse Sovereign', () => {
    // Inactive
    const perks0 = getOmniverseSovereignPerks(INITIAL_META);
    expect(perks0.hasTitle).toBe(false);
    expect(perks0.damageDealtMultiplier).toBe(1.0);
    expect(perks0.damageTakenMultiplier).toBe(1.0);

    // Active (+10% damage, -5% damage taken)
    const metaCleared: MetaState = { ...INITIAL_META, pantheonClears: 1 };
    const perks1 = getOmniverseSovereignPerks(metaCleared);
    expect(perks1.hasTitle).toBe(true);
    expect(perks1.damageDealtMultiplier).toBe(1.10);
    expect(perks1.damageTakenMultiplier).toBe(0.95);
  });

  it('records saga chronicle correctly for won raid and returns null for lost raid', () => {
    expect(recordPantheonSaga(INITIAL_META, '태초신', mockLossResult)).toBeNull();

    const chronicle = recordPantheonSaga(INITIAL_META, '태초신', mockWinResult);
    expect(chronicle).toBeDefined();
    expect(chronicle).toContain('[제1회 초월의 만신전 완파]');
    expect(chronicle).toContain('태초신');
    expect(chronicle).toContain('총 42턴 만에 격파');
    expect(chronicle).toContain('진 우주 주재신');
  });
});
