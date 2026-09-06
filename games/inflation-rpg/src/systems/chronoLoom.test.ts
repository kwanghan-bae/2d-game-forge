/**
 * chronoLoom.test.ts — C1147: Unit tests for Chrono Loom Tech Matrix & Progression Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  CHRONO_LOOM_NODES,
  ALL_CHRONO_LOOM_NODE_IDS,
  getChronoLoomNode,
  getNodeUpgradeCost,
  canUpgradeChronoLoomNode,
  upgradeChronoLoomNode,
  evaluateChronoLoomPerks,
} from './chronoLoom';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1147: Chrono Loom Tech Matrix Tests', () => {
  it('defines 4 distinct spacetime weaving nodes with maxRank 5', () => {
    expect(ALL_CHRONO_LOOM_NODE_IDS.length).toBe(4);
    for (const id of ALL_CHRONO_LOOM_NODE_IDS) {
      const node = getChronoLoomNode(id);
      expect(node).toBeDefined();
      expect(node.id).toBe(id);
      expect(node.maxRank).toBe(5);
      expect(node.nameKR.length).toBeGreaterThan(0);
      expect(node.hanja.length).toBeGreaterThan(0);
      expect(node.icon.length).toBeGreaterThan(0);
    }
  });

  it('calculates linear upgrade costs and returns Infinity beyond max rank', () => {
    expect(getNodeUpgradeCost('warp_accelerant', 0)).toBe(1);
    expect(getNodeUpgradeCost('warp_accelerant', 1)).toBe(2);
    expect(getNodeUpgradeCost('warp_accelerant', 2)).toBe(3);
    expect(getNodeUpgradeCost('warp_accelerant', 3)).toBe(4);
    expect(getNodeUpgradeCost('warp_accelerant', 4)).toBe(5);
    expect(getNodeUpgradeCost('warp_accelerant', 5)).toBe(Infinity);
  });

  it('rejects upgrade when Chrono Essence is insufficient', () => {
    const metaEmpty: MetaState = { ...INITIAL_META, chronoEssence: 0 };
    const check = canUpgradeChronoLoomNode(metaEmpty, 'singularity_aegis');

    expect(check.canUpgrade).toBe(false);
    expect(check.reason).toContain('시공 정수가 부족합니다');
    expect(check.cost).toBe(1);
  });

  it('rejects upgrade when node is already at max rank', () => {
    const metaMax: MetaState = {
      ...INITIAL_META,
      chronoEssence: 100,
      chronoLoomRanks: { singularity_aegis: 5 },
    };
    const check = canUpgradeChronoLoomNode(metaMax, 'singularity_aegis');

    expect(check.canUpgrade).toBe(false);
    expect(check.reason).toContain('최고 랭크에 도달');
  });

  it('permits upgrade and successfully updates MetaState', () => {
    const metaReady: MetaState = {
      ...INITIAL_META,
      chronoEssence: 10,
      chronoLoomRanks: { warp_accelerant: 0 },
    };

    const check = canUpgradeChronoLoomNode(metaReady, 'warp_accelerant');
    expect(check.canUpgrade).toBe(true);
    expect(check.cost).toBe(1);

    const { newMeta, upgradedRank, costPaid } = upgradeChronoLoomNode(metaReady, 'warp_accelerant');
    expect(upgradedRank).toBe(1);
    expect(costPaid).toBe(1);
    expect((newMeta as any).chronoEssence).toBe(9);
    expect(newMeta.chronoLoomRanks?.warp_accelerant).toBe(1);
  });

  it('throws error when executing upgrade on invalid state', () => {
    const metaNoEssence: MetaState = { ...INITIAL_META, chronoEssence: 0 };
    expect(() => upgradeChronoLoomNode(metaNoEssence, 'temporal_sovereign')).toThrow(
      /시공 정수가 부족합니다/
    );
  });

  it('evaluates active perks correctly from empty to max rank', () => {
    // 1. Empty ranks
    const emptyPerks = evaluateChronoLoomPerks(INITIAL_META);
    expect(emptyPerks.actionSpeedBonus).toBe(0);
    expect(emptyPerks.damageReduction).toBe(0);
    expect(emptyPerks.fatalGuard).toBe(false);
    expect(emptyPerks.duplicationChance).toBe(0);
    expect(emptyPerks.omniStatMultiplierBonus).toBe(0);
    expect(emptyPerks.totalLoomRanks).toBe(0);

    // 2. Max ranks across all 4 nodes
    const metaMax: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: {
        warp_accelerant: 5,
        singularity_aegis: 5,
        chrono_duplication: 5,
        temporal_sovereign: 5,
      },
    };

    const maxPerks = evaluateChronoLoomPerks(metaMax);
    expect(maxPerks.actionSpeedBonus).toBe(0.25); // +25%
    expect(maxPerks.damageReduction).toBe(0.20); // +20%
    expect(maxPerks.fatalGuard).toBe(true); // Rank 5 active
    expect(maxPerks.duplicationChance).toBe(0.30); // +30%
    expect(maxPerks.omniStatMultiplierBonus).toBe(0.50); // +50%
    expect(maxPerks.totalLoomRanks).toBe(20);
  });
});
