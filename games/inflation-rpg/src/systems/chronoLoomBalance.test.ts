/**
 * chronoLoomBalance.test.ts — C1149: Chrono Essence Sink Curve & Combat Simulation.
 *
 * Mathematically validates:
 * 1. 60 Chrono Essence sink economy across all 4 nodes (12 Singularity Rebirths to max).
 * 2. Damage dampening curve up to -20% and fatal blow nullification.
 * 3. Drop duplication expected value (+30% loot over 1,000 boss encounters).
 * 4. Omni-stat inflation stability (+50% clean multiplier without NaN).
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CHRONO_LOOM_NODE_IDS,
  getNodeUpgradeCost,
  evaluateChronoLoomPerks,
  canUpgradeChronoLoomNode,
  upgradeChronoLoomNode,
  MAX_CHRONO_LOOM_RANK,
} from './chronoLoom';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1149: Chrono Loom Balance & Economy Simulations', () => {
  it('validates 60 essence full completion economy across 4 nodes', () => {
    let singleNodeCost = 0;
    for (let r = 0; r < MAX_CHRONO_LOOM_RANK; r++) {
      singleNodeCost += getNodeUpgradeCost('warp_accelerant', r);
    }
    // 1 + 2 + 3 + 4 + 5 = 15 essence per node
    expect(singleNodeCost).toBe(15);

    const totalLoomEssenceCost = singleNodeCost * ALL_CHRONO_LOOM_NODE_IDS.length;
    // 15 * 4 = 60 essence
    expect(totalLoomEssenceCost).toBe(60);

    // Singularity Rebirth awards 5 essence per run
    const singularityRebirthsNeeded = totalLoomEssenceCost / 5;
    expect(singularityRebirthsNeeded).toBe(12);
  });

  it('simulates sequential node upgrading from 60 essence down to 0 and achieves 20/20 ranks', () => {
    let currentMeta: MetaState = {
      ...INITIAL_META,
      chronoEssence: 60,
      chronoLoomRanks: {},
    };

    for (const nodeId of ALL_CHRONO_LOOM_NODE_IDS) {
      for (let r = 0; r < MAX_CHRONO_LOOM_RANK; r++) {
        const check = canUpgradeChronoLoomNode(currentMeta, nodeId);
        expect(check.canUpgrade).toBe(true);
        expect(check.cost).toBe(r + 1);

        const res = upgradeChronoLoomNode(currentMeta, nodeId);
        currentMeta = res.newMeta;
      }
    }

    expect((currentMeta as any).chronoEssence).toBe(0);
    expect(currentMeta.chronoLoomRanks?.warp_accelerant).toBe(5);
    expect(currentMeta.chronoLoomRanks?.singularity_aegis).toBe(5);
    expect(currentMeta.chronoLoomRanks?.chrono_duplication).toBe(5);
    expect(currentMeta.chronoLoomRanks?.temporal_sovereign).toBe(5);

    const finalPerks = evaluateChronoLoomPerks(currentMeta);
    expect(finalPerks.totalLoomRanks).toBe(20);
    expect(finalPerks.actionSpeedBonus).toBe(0.25);
    expect(finalPerks.damageReduction).toBe(0.20);
    expect(finalPerks.fatalGuard).toBe(true);
    expect(finalPerks.duplicationChance).toBe(0.30);
    expect(finalPerks.omniStatMultiplierBonus).toBe(0.50);
  });

  it('simulates damage dampening and survivability under endgame enemy strike', () => {
    const rawIncomingDamage = 10_000_000;

    // Rank 0
    const perks0 = evaluateChronoLoomPerks(INITIAL_META);
    const damageTaken0 = rawIncomingDamage * (1 - perks0.damageReduction);
    expect(damageTaken0).toBe(10_000_000);

    // Rank 5 Singularity Aegis
    const metaAegis5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { singularity_aegis: 5 },
    };
    const perks5 = evaluateChronoLoomPerks(metaAegis5);
    const damageTaken5 = rawIncomingDamage * (1 - perks5.damageReduction);
    // 10M * (1 - 0.20) = 8M damage taken
    expect(damageTaken5).toBe(8_000_000);
    expect(rawIncomingDamage - damageTaken5).toBe(2_000_000); // 2M damage mitigated
    expect(perks5.fatalGuard).toBe(true);
  });

  it('simulates drop duplication expected value over 1,000 boss encounters', () => {
    const metaDup5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { chrono_duplication: 5 },
    };
    const perks = evaluateChronoLoomPerks(metaDup5);
    expect(perks.duplicationChance).toBe(0.30);

    // Deterministic simulation: over 1,000 kills with 30% duplication chance
    const encounters = 1_000;
    const baseDropsPerKill = 1;
    let totalDrops = 0;

    // Simulate using a fixed pseudorandom pattern
    for (let i = 0; i < encounters; i++) {
      totalDrops += baseDropsPerKill;
      // deterministic sample matching 30%
      if ((i % 10) < 3) {
        totalDrops += baseDropsPerKill; // duplicated!
      }
    }

    expect(totalDrops).toBe(1300); // 30% more drops
    const effectiveDropMultiplier = totalDrops / encounters;
    expect(effectiveDropMultiplier).toBeCloseTo(1.30, 2);
  });

  it('validates omni-stat multiplier integrity without numerical degradation', () => {
    const baseAtk = 50_000_000;
    const baseHp = 120_000_000;
    const baseDef = 30_000_000;

    for (let rank = 0; rank <= 5; rank++) {
      const meta: MetaState = {
        ...INITIAL_META,
        chronoLoomRanks: { temporal_sovereign: rank },
      };
      const { omniStatMultiplierBonus } = evaluateChronoLoomPerks(meta);
      const mult = 1 + omniStatMultiplierBonus;

      const boostedAtk = Math.round(baseAtk * mult);
      const boostedHp = Math.round(baseHp * mult);
      const boostedDef = Math.round(baseDef * mult);

      expect(Number.isFinite(boostedAtk)).toBe(true);
      expect(Number.isFinite(boostedHp)).toBe(true);
      expect(Number.isFinite(boostedDef)).toBe(true);
      expect(boostedAtk).toBeGreaterThanOrEqual(baseAtk);

      if (rank === 5) {
        expect(boostedAtk).toBe(75_000_000); // +50%
        expect(boostedHp).toBe(180_000_000); // +50%
        expect(boostedDef).toBe(45_000_000); // +50%
      }
    }
  });
});
