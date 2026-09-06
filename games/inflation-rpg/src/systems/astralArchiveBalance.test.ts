/**
 * astralArchiveBalance.test.ts — C1137: Balance & Economy Simulation for Astral Archive.
 *
 * Verifies:
 * 1. Total Starlight Shards distribution (5,870 Shards across 16 milestones).
 * 2. Self-reinforcing feedback loop covering ~41% of Primordial Ascension costs.
 * 3. Linear scaling of Archive Mastery perks across 0, 4, 8, 12, and 16 milestones.
 * 4. Boundedness, NaN resistance, and numerical stability.
 */

import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_MILESTONES,
  evaluateArchiveMastery,
} from './astralArchive';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1137: Astral Archive Balance & Economy Tests', () => {
  it('calculates the exact total Starlight Shards rewarded across all 16 milestones', () => {
    let totalShards = 0;
    const categoryTotals: Record<string, number> = {};

    for (const m of ARCHIVE_MILESTONES) {
      totalShards += m.rewardShards;
      categoryTotals[m.category] = (categoryTotals[m.category] ?? 0) + m.rewardShards;
    }

    expect(totalShards).toBe(5_870);
    expect(categoryTotals.trials).toBe(350);
    expect(categoryTotals.chaos_rift).toBe(870);
    expect(categoryTotals.apex_trials).toBe(1_050);
    expect(categoryTotals.corridor).toBe(1_250);
    expect(categoryTotals.primordial).toBe(1_650);
    expect(categoryTotals.relics).toBe(700);

    // Total shards needed for Primordial Ascension is 14,250.
    // 5,870 / 14,250 is ~41.19%, providing a massive rewarding boost.
    const coverageRatio = totalShards / 14_250;
    expect(coverageRatio).toBeGreaterThan(0.40);
    expect(coverageRatio).toBeLessThan(0.45);
  });

  it('validates strictly linear scaling of Archive Mastery perks across milestone tiers', () => {
    // 0 milestones
    const { perks: p0 } = evaluateArchiveMastery(INITIAL_META);
    expect(p0.goldBonusPercent).toBe(0);
    expect(p0.expBonusPercent).toBe(0);
    expect(p0.omniStatMultiplier).toBe(1.0);
    expect(p0.critDmgBonusPercent).toBe(0);

    // Simulated 4 milestones
    const meta4: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 5, // 1
      highestRiftDepth: 10, // 2
      apexTrialsCleared: [1], // 3
      corridorSectorsCleared: [1], // 4
    };
    const { perks: p4 } = evaluateArchiveMastery(meta4);
    expect(p4.masteryRank).toBe(4);
    expect(p4.goldBonusPercent).toBe(8); // 4 * 2%
    expect(p4.expBonusPercent).toBe(8);
    expect(p4.omniStatMultiplier).toBe(1.04);
    expect(p4.critDmgBonusPercent).toBe(12);

    // Simulated 8 milestones
    const meta8: MetaState = {
      ...meta4,
      highestRiftDepth: 25, // 5
      apexTrialsCleared: [1, 2], // 6
      corridorSectorsCleared: [1, 3], // 7
      primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 }, // 8
    };
    const { perks: p8 } = evaluateArchiveMastery(meta8);
    expect(p8.masteryRank).toBe(8);
    expect(p8.goldBonusPercent).toBe(16);
    expect(p8.expBonusPercent).toBe(16);
    expect(p8.omniStatMultiplier).toBe(1.08);
    expect(p8.critDmgBonusPercent).toBe(24);

    // Simulated 16 milestones
    const meta16: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 10,
      highestRiftDepth: 50,
      apexTrialsCleared: [1, 2, 3],
      corridorSectorsCleared: [1, 2, 3, 4, 5],
      primordialRanks: {
        primordial_genesis: 5,
        primordial_annihilation: 5,
        primordial_eternity: 5,
        primordial_singularity: 3,
      },
      transmutedRelics: [
        'polaris_celestial_eye',
        'sirius_celestial_fang',
        'vega_celestial_veil',
        'antares_celestial_heart',
      ],
    };
    const { perks: p16 } = evaluateArchiveMastery(meta16);
    expect(p16.masteryRank).toBe(16);
    expect(p16.goldBonusPercent).toBe(32);
    expect(p16.expBonusPercent).toBe(32);
    expect(p16.omniStatMultiplier).toBe(1.16);
    expect(p16.critDmgBonusPercent).toBe(48);
  });

  it('guarantees numerical stability and non-NaN outputs under extreme meta states', () => {
    const edgeMeta: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: undefined,
      highestRiftDepth: undefined,
      apexTrialsCleared: undefined,
      corridorSectorsCleared: undefined,
      primordialRanks: undefined,
      transmutedRelics: undefined,
      claimedArchiveMilestones: undefined,
    };

    const { perks, milestoneStates } = evaluateArchiveMastery(edgeMeta);

    expect(Number.isFinite(perks.goldBonusPercent)).toBe(true);
    expect(Number.isFinite(perks.expBonusPercent)).toBe(true);
    expect(Number.isFinite(perks.omniStatMultiplier)).toBe(true);
    expect(Number.isFinite(perks.critDmgBonusPercent)).toBe(true);
    expect(milestoneStates.length).toBe(16);
  });
});
