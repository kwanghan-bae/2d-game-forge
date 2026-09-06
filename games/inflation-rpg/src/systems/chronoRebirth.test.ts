/**
 * chronoRebirth.test.ts — C1141: Unit tests for Chrono-Rift Warp & Singularity Rebirth Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  CHRONO_REBIRTH_TIERS,
  checkChronoRebirthEligibility,
  executeChronoRebirth,
} from './chronoRebirth';
import { INITIAL_META, INITIAL_RUN } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1141: Chrono-Rift Warp & Singularity Rebirth Engine Tests', () => {
  it('contains 4 tiers of Chrono Rebirth in descending order of requirement', () => {
    expect(CHRONO_REBIRTH_TIERS.length).toBe(4);
    expect(CHRONO_REBIRTH_TIERS[0].id).toBe('singularity_rebirth');
    expect(CHRONO_REBIRTH_TIERS[1].id).toBe('primordial_warp');
    expect(CHRONO_REBIRTH_TIERS[2].id).toBe('astral_warp');
    expect(CHRONO_REBIRTH_TIERS[3].id).toBe('apprentice_warp');
  });

  it('rejects rebirth eligibility when archive mastery rank is below 4', () => {
    const check = checkChronoRebirthEligibility(INITIAL_META);
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('마스터리 4랭크 이상 필요');
  });

  it('identifies appropriate tier based on unlocked archive milestones', () => {
    // 4 milestones -> apprentice_warp
    const meta4: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 5,
      highestRiftDepth: 10,
      apexTrialsCleared: [1],
      corridorSectorsCleared: [1],
    };
    const check4 = checkChronoRebirthEligibility(meta4);
    expect(check4.eligible).toBe(true);
    expect(check4.tier?.id).toBe('apprentice_warp');
    expect(check4.tier?.startingLevel).toBe(50);
    expect(check4.tier?.startingGold).toBe(5_000_000);

    // 8 milestones -> astral_warp
    const meta8: MetaState = {
      ...meta4,
      highestRiftDepth: 25,
      apexTrialsCleared: [1, 2],
      corridorSectorsCleared: [1, 3],
      primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 },
    };
    const check8 = checkChronoRebirthEligibility(meta8);
    expect(check8.eligible).toBe(true);
    expect(check8.tier?.id).toBe('astral_warp');
    expect(check8.tier?.startingLevel).toBe(100);

    // 16 milestones -> singularity_rebirth
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
    const check16 = checkChronoRebirthEligibility(meta16);
    expect(check16.eligible).toBe(true);
    expect(check16.tier?.id).toBe('singularity_rebirth');
    expect(check16.tier?.startingLevel).toBe(200);
    expect(check16.tier?.startingGold).toBe(100_000_000);
    expect(check16.tier?.chronoEssenceReward).toBe(5);
  });

  it('throws error when executing rebirth on ineligible account', () => {
    expect(() => executeChronoRebirth(INITIAL_META, INITIAL_RUN)).toThrow(
      /환생 자격 미달/
    );
  });

  it('successfully executes rebirth and outputs transformed meta and run states', () => {
    const meta8: MetaState = {
      ...INITIAL_META,
      ascensionTrialClearedFloor: 5,
      highestRiftDepth: 25,
      apexTrialsCleared: [1, 2],
      corridorSectorsCleared: [1, 3],
      primordialRanks: { primordial_genesis: 3, primordial_annihilation: 3 },
      totalRebirths: 1,
      chronoEssence: 2,
    } as any;

    const { newMeta, newRun, summary } = executeChronoRebirth(meta8, INITIAL_RUN);

    // Total rebirths incremented: 1 -> 2
    expect((newMeta as any).totalRebirths).toBe(2);
    // Chrono essence accumulated: 2 + 2 = 4
    expect((newMeta as any).chronoEssence).toBe(4);

    // Run state updated with starting bonuses
    expect(newRun.level).toBe(100);
    expect(newRun.goldThisRun).toBe(15_000_000);

    // Summary matches tier
    expect(summary.startingLevel).toBe(100);
    expect(summary.startingGold).toBe(15_000_000);
    expect(summary.chronoEssenceGained).toBe(2);
    expect(summary.totalChronoEssence).toBe(4);
  });
});
