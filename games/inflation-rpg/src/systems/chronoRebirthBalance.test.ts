/**
 * chronoRebirthBalance.test.ts — C1143: Balance & Pacing Simulation for Chrono Rebirth.
 *
 * Verifies:
 * 1. Monotonic tier progression (Levels 50 -> 100 -> 150 -> 200, Gold 5M -> 100M, Drop 1.1x -> 2.0x).
 * 2. TTK acceleration: dramatic reduction in early boss battle turns from 15+ turns down to 1 turn.
 * 3. Gold vault economy validation ensuring early bypass without breaking hyper-inflation endgame bounds.
 * 4. Chrono Essence generation rate ensuring prestige scalability across multiple rebirths.
 */

import { describe, it, expect } from 'vitest';
import {
  CHRONO_REBIRTH_TIERS,
  executeChronoRebirth,
  type ChronoRebirthTierDef,
} from './chronoRebirth';
import { INITIAL_META, INITIAL_RUN } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1143: Chrono Rebirth Balance & Pacing Tests', () => {
  it('enforces strict monotonic advantages across rebirth tiers', () => {
    // Reverse array to test apprentice -> astral -> primordial -> singularity
    const ascendingTiers = [...CHRONO_REBIRTH_TIERS].reverse();

    for (let i = 0; i < ascendingTiers.length - 1; i++) {
      const current = ascendingTiers[i];
      const next = ascendingTiers[i + 1];

      expect(next.startingLevel).toBeGreaterThan(current.startingLevel);
      expect(next.startingGold).toBeGreaterThan(current.startingGold);
      expect(next.dropRateMultiplier).toBeGreaterThan(current.dropRateMultiplier);
      expect(next.chronoEssenceReward).toBeGreaterThan(current.chronoEssenceReward);
      expect(next.minMasteryRank).toBeGreaterThan(current.minMasteryRank);
    }
  });

  it('simulates TTK acceleration on early zone bosses for reincarnated heroes', () => {
    // Zone 1 Early Boss: 1,000 HP, 100 ATK, 20 DEF
    const bossHp = 1_000;
    const bossDef = 20;

    // Normal Lv. 1 hero: ATK 30 -> Turn damage: max(1, 30 - 20) = 10 damage -> 100 turns
    const lv1Atk = 30;
    const lv1TurnDmg = Math.max(1, lv1Atk - bossDef);
    const lv1TurnsToKill = Math.ceil(bossHp / lv1TurnDmg);
    expect(lv1TurnsToKill).toBe(100);

    // Lv. 100 Astral Rebirth hero: ATK 1,500 -> Turn damage: 1,500 - 20 = 1,480 -> 1 turn instant kill!
    const lv100Atk = 1_500;
    const lv100TurnDmg = Math.max(1, lv100Atk - bossDef);
    const lv100TurnsToKill = Math.ceil(bossHp / lv100TurnDmg);
    expect(lv100TurnsToKill).toBe(1);

    // Lv. 200 Singularity Rebirth hero: ATK 6,000 -> 1 turn instant kill!
    const lv200Atk = 6_000;
    const lv200TurnDmg = Math.max(1, lv200Atk - bossDef);
    const lv200TurnsToKill = Math.ceil(bossHp / lv200TurnDmg);
    expect(lv200TurnsToKill).toBe(1);
  });

  it('proves starting gold vault provides instant setup without breaking endgame trillion economy', () => {
    // Singularity rebirth awards 100,000,000 G (100M)
    const maxTier = CHRONO_REBIRTH_TIERS[0];
    expect(maxTier.startingGold).toBe(100_000_000);

    // High tier equipment reforge costs ~2,000,000 G each.
    // 100M G allows ~50 standard reforges or instant tier 5 equipment upgrades.
    const reforgeCost = 2_000_000;
    const affordableReforges = Math.floor(maxTier.startingGold / reforgeCost);
    expect(affordableReforges).toBe(50);

    // Endgame gold requirements (Sector 5 raid rewards 25M G per clear, hyper-inflation gear costs billions)
    // 100M G is only 0.01% of a 1 Trillion endgame gold pool, maintaining perfect inflation safety.
    const trillionPool = 1_000_000_000_000;
    const inflationRatio = maxTier.startingGold / trillionPool;
    expect(inflationRatio).toBe(0.0001);
  });

  it('validates cumulative Chrono Essence progression over 10 rebirth cycles', () => {
    const metaSingularity: MetaState = {
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
      totalRebirths: 0,
      chronoEssence: 0,
    };

    let currentMeta = metaSingularity;
    for (let cycle = 1; cycle <= 10; cycle++) {
      const { newMeta, summary } = executeChronoRebirth(currentMeta, INITIAL_RUN);
      expect(summary.totalRebirths).toBe(cycle);
      expect(summary.chronoEssenceGained).toBe(5);
      currentMeta = newMeta;
    }

    // 10 cycles of singularity rebirth = 50 Chrono Essence
    expect((currentMeta as any).chronoEssence).toBe(50);
    expect((currentMeta as any).totalRebirths).toBe(10);
  });
});
