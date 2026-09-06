/**
 * astralArchivePerks.test.ts — C1139: Unit tests for Dynamic Archive Mastery Perks Injection.
 */

import { describe, it, expect } from 'vitest';
import {
  applyArchiveCombatStats,
  applyArchiveGoldMultiplier,
  applyArchiveExpMultiplier,
} from './astralArchivePerks';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1139: Astral Archive Perks Dynamic Injection Tests', () => {
  it('leaves stats and progression unchanged for a baseline initial meta state', () => {
    const baseStats = { hpMax: 100_000, atk: 20_000, def: 5_000, critMultiplier: 1.5 };
    const enhanced = applyArchiveCombatStats(baseStats, INITIAL_META);

    expect(enhanced.hpMax).toBe(100_000);
    expect(enhanced.atk).toBe(20_000);
    expect(enhanced.def).toBe(5_000);
    expect(enhanced.critMultiplier).toBe(1.5);
    expect(enhanced.perks.masteryRank).toBe(0);

    expect(applyArchiveGoldMultiplier(1000, INITIAL_META)).toBe(1000);
    expect(applyArchiveExpMultiplier(2000, INITIAL_META)).toBe(2000);
  });

  it('amplifies stats and yields accurately for a mid-game account (6 milestones)', () => {
    const midMeta: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 5, // 1
      highestRiftDepth: 15, // 2
      apexTrialsCleared: [1], // 3
      corridorSectorsCleared: [1], // 4
      primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 }, // 5 (6 ranks)
      transmutedRelics: ['polaris_celestial_eye', 'sirius_celestial_fang'], // 6 (2 relics)
    };

    const baseStats = { hpMax: 1_000_000, atk: 500_000, def: 100_000, critMultiplier: 1.5 };
    const enhanced = applyArchiveCombatStats(baseStats, midMeta);

    // 6 milestones = +6% omni, +18% crit dmg
    expect(enhanced.hpMax).toBe(1_060_000);
    expect(enhanced.atk).toBe(530_000);
    expect(enhanced.def).toBe(106_000);
    expect(enhanced.critMultiplier).toBe(1.68);

    // +12% gold, +12% exp
    expect(applyArchiveGoldMultiplier(1000, midMeta)).toBe(1120);
    expect(applyArchiveExpMultiplier(2000, midMeta)).toBe(2240);
  });

  it('delivers peak account-wide boosts for max endgame completion (16 milestones)', () => {
    const maxMeta: MetaState = {
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

    const baseStats = { hpMax: 10_000_000, atk: 5_000_000, def: 2_000_000, critMultiplier: 1.5 };
    const enhanced = applyArchiveCombatStats(baseStats, maxMeta);

    // 16 milestones = +16% omni, +48% crit dmg
    expect(enhanced.hpMax).toBe(11_600_000);
    expect(enhanced.atk).toBe(5_800_000);
    expect(enhanced.def).toBe(2_320_000);
    expect(enhanced.critMultiplier).toBe(1.98);

    // +32% gold, +32% exp
    expect(applyArchiveGoldMultiplier(10_000, maxMeta)).toBe(13_200);
    expect(applyArchiveExpMultiplier(10_000, maxMeta)).toBe(13_200);
  });

  it('safely handles 0 and negative inputs', () => {
    expect(applyArchiveGoldMultiplier(0, INITIAL_META)).toBe(0);
    expect(applyArchiveGoldMultiplier(-50, INITIAL_META)).toBe(0);
    expect(applyArchiveExpMultiplier(0, INITIAL_META)).toBe(0);
    expect(applyArchiveExpMultiplier(-100, INITIAL_META)).toBe(0);
  });
});
