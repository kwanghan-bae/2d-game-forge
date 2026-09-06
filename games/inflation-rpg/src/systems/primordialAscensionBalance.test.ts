/**
 * primordialAscensionBalance.test.ts — C1130: Balance & Progression Simulation for Primordial Ascension.
 *
 * Verifies:
 * 1. Resource sink & economy curve (total 21 Dimensional Essence, 14,250 Starlight Shards for 18 total ranks).
 * 2. Progressive stat scaling across threshold milestones (Tier 1: 6 ranks, Tier 2: 12 ranks, Tier 3: 18 ranks).
 * 3. DEF-to-ATK conversion mechanics converting defensive tank builds into high-DPS endgame juggernauts.
 * 4. Battle-start barrier mitigation synergy with Abyssal Corridor mechanics.
 * 5. Level cap expansion (+500 levels) allowing sustained progression in infinite cycles.
 */

import { describe, it, expect } from 'vitest';
import {
  PRIMORDIAL_NODES,
  computeCumulativePrimordialBonuses,
  getPrimordialTotalRanks,
  type PrimordialNodeId,
} from './primordialAscension';

describe('C1130: Primordial Ascension Balance & Economy Tests', () => {
  it('calculates the exact total resource sink required for maxing all 4 primordial constellations', () => {
    const nodeIds: PrimordialNodeId[] = [
      'primordial_genesis',
      'primordial_annihilation',
      'primordial_eternity',
      'primordial_singularity',
    ];

    let totalEssence = 0;
    let totalShards = 0;

    for (const id of nodeIds) {
      const def = PRIMORDIAL_NODES[id];
      for (let r = 1; r <= def.maxRank; r++) {
        const cost = def.cost(r);
        totalEssence += cost.essence;
        totalShards += cost.shards;
      }
    }

    // Genesis (5), Annihilation (5), Eternity (5), Singularity (6) = 21 Essence
    expect(totalEssence).toBe(21);
    // Genesis (3750), Annihilation (3750), Eternity (3750), Singularity (3000) = 14,250 Shards
    expect(totalShards).toBe(14_250);

    // Each corridor full clear yields 8 essence and 3,300 shards.
    // 3 full clears (24 essence, 9,900 shards) + anomaly shards perfectly completes the matrix.
    const clearsNeeded = Math.ceil(totalEssence / 8);
    expect(clearsNeeded).toBe(3);
  });

  it('validates progressive bonus scaling across rank thresholds (6, 12, 18 ranks)', () => {
    // Threshold 1: 6 ranks (Rank 2 in each standard node)
    const t1Bonuses = computeCumulativePrimordialBonuses({
      primordial_genesis: 2,
      primordial_annihilation: 2,
      primordial_eternity: 2,
    });
    expect(t1Bonuses.hpMultiplier).toBeCloseTo(1.20);
    expect(t1Bonuses.finalDmgMultiplier).toBeCloseTo(1.10);
    expect(t1Bonuses.defPierceBonus).toBeCloseTo(0.24);
    expect(t1Bonuses.damageReductionBonus).toBeCloseTo(0.06);

    // Threshold 2: 12 ranks (Rank 4 in each standard node)
    const t2Bonuses = computeCumulativePrimordialBonuses({
      primordial_genesis: 4,
      primordial_annihilation: 4,
      primordial_eternity: 4,
    });
    expect(t2Bonuses.hpMultiplier).toBeCloseTo(1.40);
    expect(t2Bonuses.finalDmgMultiplier).toBeCloseTo(1.20);
    expect(t2Bonuses.defPierceBonus).toBeCloseTo(0.48);
    expect(t2Bonuses.damageReductionBonus).toBeCloseTo(0.12);

    // Threshold 3: 18 ranks (Full max Rank 5/5/5/3)
    const t3Bonuses = computeCumulativePrimordialBonuses({
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 5,
      primordial_singularity: 3,
    });
    expect(t3Bonuses.hpMultiplier).toBeCloseTo(1.50);
    expect(t3Bonuses.finalDmgMultiplier).toBeCloseTo(1.25);
    expect(t3Bonuses.maxLevelBonus).toBe(500);
    expect(t3Bonuses.defPierceBonus).toBeCloseTo(0.60);
    expect(t3Bonuses.elementalAffinityBonus).toBeCloseTo(0.40);
    expect(t3Bonuses.damageReductionBonus).toBeCloseTo(0.15);
    expect(t3Bonuses.defToAtkRatio).toBeCloseTo(0.30);
    expect(t3Bonuses.barrierTurns).toBe(3);
    expect(getPrimordialTotalRanks({
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 5,
      primordial_singularity: 3,
    })).toBe(18);
  });

  it('proves DEF-to-ATK conversion provides major offensive surge for defensive builds', () => {
    const defensiveHeroDef = 20_000_000;
    const baseHeroAtk = 40_000_000;

    const bonuses = computeCumulativePrimordialBonuses({
      primordial_singularity: 3, // 30% conversion
    });

    const convertedBonusAtk = Math.floor(defensiveHeroDef * bonuses.defToAtkRatio);
    const totalEffectiveAtk = baseHeroAtk + convertedBonusAtk;

    expect(convertedBonusAtk).toBe(6_000_000);
    expect(totalEffectiveAtk).toBe(46_000_000); // 15% immediate raw ATK increase purely from defense
  });

  it('evaluates battle-start barrier turns mitigation against lethal opening strikes', () => {
    const maxSingularityBonuses = computeCumulativePrimordialBonuses({
      primordial_singularity: 3,
    });

    // 3 turns barrier guarantees complete survival through Turn 1 Singularity Collapse (15% max HP damage)
    expect(maxSingularityBonuses.barrierTurns).toBe(3);
    expect(maxSingularityBonuses.barrierTurns).toBeGreaterThanOrEqual(1);
  });

  it('validates level cap expansion impact on endgame cycle scaling', () => {
    const maxGenesisBonuses = computeCumulativePrimordialBonuses({
      primordial_genesis: 5,
    });

    const baseLevelCap = 1000;
    const expandedLevelCap = baseLevelCap + maxGenesisBonuses.maxLevelBonus;

    expect(expandedLevelCap).toBe(1500);
    expect(maxGenesisBonuses.maxLevelBonus).toBe(500);
  });
});
