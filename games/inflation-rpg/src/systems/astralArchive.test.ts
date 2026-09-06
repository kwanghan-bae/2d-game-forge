/**
 * astralArchive.test.ts — C1135: Unit tests for Astral Archive Milestone Index & Mastery Perk Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_MILESTONES,
  evaluateArchiveMastery,
  type ArchiveCategory,
} from './astralArchive';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1135: Astral Archive Engine Tests', () => {
  it('contains 16 milestones spanning all 6 endgame categories', () => {
    expect(ARCHIVE_MILESTONES.length).toBe(16);

    const categories: ArchiveCategory[] = [
      'trials',
      'chaos_rift',
      'apex_trials',
      'corridor',
      'primordial',
      'relics',
    ];

    for (const cat of categories) {
      const filtered = ARCHIVE_MILESTONES.filter(m => m.category === cat);
      expect(filtered.length).toBeGreaterThan(0);
    }
  });

  it('evaluates 0 unlocked milestones for a fresh initial meta state', () => {
    const { perks, milestoneStates } = evaluateArchiveMastery(INITIAL_META);

    expect(perks.unlockedCount).toBe(0);
    expect(perks.claimedCount).toBe(0);
    expect(perks.masteryRank).toBe(0);
    expect(perks.goldBonusPercent).toBe(0);
    expect(perks.omniStatMultiplier).toBe(1.0);
    expect(milestoneStates.every(m => !m.unlocked)).toBe(true);
  });

  it('evaluates mid-game achievements correctly', () => {
    const midMeta: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 5,
      highestRiftDepth: 15,
      apexTrialsCleared: [1],
      corridorSectorsCleared: [1],
      primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 }, // 6 ranks
      transmutedRelics: ['polaris_celestial_eye', 'sirius_celestial_fang'], // 2 relics
    };

    const { perks, milestoneStates } = evaluateArchiveMastery(midMeta);

    // Expected unlocks:
    // trials_floor_5
    // rift_depth_10
    // apex_tier_1
    // corridor_sector_1
    // primordial_ranks_6
    // transmuted_relics_2
    expect(perks.unlockedCount).toBe(6);
    expect(perks.masteryRank).toBe(6);
    expect(perks.goldBonusPercent).toBe(12); // 6 * 2%
    expect(perks.expBonusPercent).toBe(12); // 6 * 2%
    expect(perks.omniStatMultiplier).toBe(1.06); // 1.0 + 0.06
    expect(perks.critDmgBonusPercent).toBe(18); // 6 * 3%

    const unlockedIds = milestoneStates.filter(m => m.unlocked).map(m => m.def.id);
    expect(unlockedIds).toContain('trials_floor_5');
    expect(unlockedIds).toContain('rift_depth_10');
    expect(unlockedIds).toContain('apex_tier_1');
    expect(unlockedIds).toContain('corridor_sector_1');
    expect(unlockedIds).toContain('primordial_ranks_6');
    expect(unlockedIds).toContain('transmuted_relics_2');
  });

  it('evaluates max endgame state: all 16 milestones unlocked with peak perks', () => {
    const endgameMeta: MetaState = {
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
      }, // 18 ranks
      transmutedRelics: [
        'polaris_celestial_eye',
        'sirius_celestial_fang',
        'vega_celestial_veil',
        'antares_celestial_heart',
      ], // 4 relics
      claimedArchiveMilestones: ['trials_floor_5', 'trials_floor_10'],
    } as any;

    const { perks, milestoneStates } = evaluateArchiveMastery(endgameMeta);

    expect(perks.unlockedCount).toBe(16);
    expect(perks.claimedCount).toBe(2);
    expect(perks.masteryRank).toBe(16);
    expect(perks.goldBonusPercent).toBe(32); // +32%
    expect(perks.expBonusPercent).toBe(32); // +32%
    expect(perks.omniStatMultiplier).toBe(1.16); // +16%
    expect(perks.critDmgBonusPercent).toBe(48); // +48%

    expect(milestoneStates.every(m => m.unlocked)).toBe(true);
  });
});
