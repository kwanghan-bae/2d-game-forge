/**
 * primordialResonance.test.ts — C1132: Unit tests for Primordial Resonance Harmonizer.
 */

import { describe, it, expect } from 'vitest';
import {
  computePrimordialResonance,
  harmonizeHeroCombatStats,
} from './primordialResonance';

describe('C1132: Primordial Resonance Harmonizer Tests', () => {
  it('returns tier none for 0 awakened ranks', () => {
    const res = computePrimordialResonance({});
    expect(res.tier).toBe('none');
    expect(res.totalRanks).toBe(0);
    expect(res.omniStatMultiplier).toBe(1.0);
    expect(res.bonusDefPierce).toBe(0);
  });

  it('awards genesis_spark tier for 1 to 5 ranks', () => {
    const res = computePrimordialResonance({ primordial_genesis: 3 });
    expect(res.tier).toBe('genesis_spark');
    expect(res.totalRanks).toBe(3);
    expect(res.omniStatMultiplier).toBe(1.02);
  });

  it('awards cosmic_alignment tier for 6 to 11 ranks', () => {
    const res = computePrimordialResonance({
      primordial_genesis: 3,
      primordial_annihilation: 3,
      primordial_eternity: 2,
    });
    expect(res.tier).toBe('cosmic_alignment');
    expect(res.totalRanks).toBe(8);
    expect(res.omniStatMultiplier).toBe(1.05);
    expect(res.bonusDefPierce).toBe(0.05);
  });

  it('awards primordial_zenith tier for 12 to 17 ranks', () => {
    const res = computePrimordialResonance({
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 4,
    });
    expect(res.tier).toBe('primordial_zenith');
    expect(res.totalRanks).toBe(14);
    expect(res.omniStatMultiplier).toBe(1.10);
    expect(res.bonusDefPierce).toBe(0.10);
    expect(res.bonusFinalDmgMultiplier).toBe(1.05);
    expect(res.bonusElementalAffinity).toBe(0.05);
  });

  it('awards sovereign_singularity tier for full 18 ranks', () => {
    const res = computePrimordialResonance({
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 5,
      primordial_singularity: 3,
    });
    expect(res.tier).toBe('sovereign_singularity');
    expect(res.totalRanks).toBe(18);
    expect(res.omniStatMultiplier).toBe(1.15);
    expect(res.bonusDefPierce).toBe(0.15);
    expect(res.bonusFinalDmgMultiplier).toBe(1.10);
    expect(res.bonusElementalAffinity).toBe(0.10);
  });

  it('correctly harmonizes hero combat stats with DEF-to-ATK conversion and caps', () => {
    const rawStats = {
      hpMax: 10_000_000,
      atk: 5_000_000,
      def: 2_000_000,
      dr: 0.80,
      defPierce: 0.30,
      elementalAffinity: 0.10,
      finalDmgMultiplier: 1.20,
    };

    const harmonized = harmonizeHeroCombatStats(rawStats, {
      primordial_genesis: 5,
      primordial_annihilation: 5,
      primordial_eternity: 5,
      primordial_singularity: 3,
    });

    // 18 ranks = sovereign_singularity (+15% omni)
    // Converted ATK: 2,000,000 * 30% = +600,000. Base with conversion = 5,600,000.
    // Effective ATK: 5,600,000 * 1.15 = 6,440,000.
    expect(harmonized.effectiveAtk).toBe(6_440_000);

    // HP: 10,000,000 * 1.50 (genesis) * 1.15 (omni) = 17,250,000
    expect(harmonized.effectiveHpMax).toBe(17_250_000);

    // DR: capped at 0.90
    expect(harmonized.effectiveDR).toBe(0.90);

    // Pierce: 0.30 + 0.60 (annihilation) + 0.15 (tier bonus) = 1.05 -> capped at 0.95
    expect(harmonized.effectiveDefPierce).toBe(0.95);

    // Barrier turns: 3
    expect(harmonized.barrierTurns).toBe(3);
    expect(harmonized.resonanceTier).toBe('sovereign_singularity');
  });
});
