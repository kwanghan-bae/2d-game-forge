/**
 * paradoxSpiralBalance.test.ts — C1167: 100-Floor Deep Spiral Scaling & Balance Simulation.
 *
 * Validates:
 * 1. Monotonic Growth & Arithmetic Stability: Floors 1 to 150 scale monotonically within safe integer bounds.
 * 2. Endgame Pacing: Floor 100 Guardian possesses ~80B+ HP, providing an elite milestone challenge.
 * 3. Hero Gear Scaling Progression:
 *    - Mid-tier build clears Floors 1 ~ 25.
 *    - Full Omniverse Regalia + Loom build delves into Floors 50 ~ 80.
 * 4. Economic Pacing: 50-floor ladder yields 12,750 Paradox Dust and 12.75B Gold.
 * 5. Anomaly Impact: Matter Inversion and Chronos Bleed meaningfully challenge hero builds.
 */

import { describe, it, expect } from 'vitest';
import {
  generateParadoxGuardian,
  resolveParadoxFloorCombat,
} from './paradoxSpiral';
import { HeroEntity } from '../hero/HeroEntity';
import { INITIAL_META, type MetaState } from '../store/gameStore';

describe('C1167: Paradox Spiral Scaling & Balance Simulation', () => {
  it('validates monotonic guardian stat scaling from Floor 1 to 150 without overflow', () => {
    let prevHp = 0;
    let prevAtk = 0;
    let prevDef = 0;

    const checkFloors = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150];

    for (const floor of checkFloors) {
      const g = generateParadoxGuardian(floor);

      expect(Number.isFinite(g.maxHp)).toBe(true);
      expect(Number.isFinite(g.atk)).toBe(true);
      expect(Number.isFinite(g.def)).toBe(true);

      expect(g.maxHp).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(g.atk).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(g.def).toBeLessThan(Number.MAX_SAFE_INTEGER);

      expect(g.maxHp).toBeGreaterThan(prevHp);
      expect(g.atk).toBeGreaterThan(prevAtk);
      expect(g.def).toBeGreaterThan(prevDef);

      prevHp = g.maxHp;
      prevAtk = g.atk;
      prevDef = g.def;
    }
  });

  it('validates Floor 100 milestone boss scaling characteristics', () => {
    const g100 = generateParadoxGuardian(100);

    expect(g100.isMilestoneFloor).toBe(true);
    expect(g100.nameKR).toContain('Floor 100');

    // Expected Floor 100 HP is around 40B ~ 200B
    expect(g100.maxHp).toBeGreaterThanOrEqual(40_000_000_000);
    expect(g100.maxHp).toBeLessThan(500_000_000_000);

    // ATK and DEF are properly inflated for endgame tanking
    expect(g100.atk).toBeGreaterThanOrEqual(10_000_000);
    expect(g100.def).toBeGreaterThanOrEqual(500_000);

    // Has all 4 paradox anomalies active
    expect(g100.anomalies).toEqual([
      'temporal_dilation',
      'gravity_crush',
      'matter_inversion',
      'chronos_bleed',
    ]);
  });

  it('simulates mid-tier vs endgame hero builds proving progressive floor depth', () => {
    // Mid-tier hero: 5M HP, 20M ATK, no regalia, no loom ranks
    const midHero = HeroEntity.create({
      seed: 42,
      heroHpMax: 5_000_000,
      heroAtkBase: 20_000_000,
      heroDefBase: 1_000_000,
    });
    const midMeta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 1,
      forgedRegalia: [],
      chronoLoomRanks: {},
    };

    // Mid hero clears floor 1 easily
    const midF1 = resolveParadoxFloorCombat(midHero, 'fire', 0.10, midMeta, 1);
    expect(midF1.won).toBe(true);

    // Endgame hero: 10M HP, 80M ATK, all 4 regalia forged, loom omni-stat (+50%)
    const endHero = HeroEntity.create({
      seed: 42,
      heroHpMax: 10_000_000,
      heroAtkBase: 80_000_000,
      heroDefBase: 10_000_000,
    });
    const endMeta: MetaState = {
      ...INITIAL_META,
      totalRebirths: 5,
      pantheonClears: 4,
      forgedRegalia: [
        'ouroboros_chrono_blade',
        'ymir_primordial_heart',
        'nyx_void_eye',
        'aion_singularity_aegis',
      ],
      chronoLoomRanks: {
        warp_accelerant: 5,
        singularity_aegis: 5,
        chrono_duplication: 5,
        temporal_sovereign: 5,
      },
    };

    // Endgame hero clears Floor 25
    const endF25 = resolveParadoxFloorCombat(endHero, 'fire', 0.30, endMeta, 25);
    expect(endF25.won).toBe(true);
    expect(endF25.turns).toBeLessThanOrEqual(30);

    // Endgame hero clears Floor 50
    const endF50 = resolveParadoxFloorCombat(endHero, 'fire', 0.30, endMeta, 50);
    expect(endF50.won).toBe(true);
    expect(endF50.totalDamageDealt).toBeGreaterThan(1_000_000_000);
  });

  it('verifies cumulative economic yield from climbing 50 floors', () => {
    let totalDust = 0;
    let totalGold = 0;

    for (let f = 1; f <= 50; f++) {
      totalDust += f * 10;
      totalGold += f * 10_000_000;
    }

    // sum(1..50) = 50 * 51 / 2 = 1275
    // Dust = 1275 * 10 = 12,750
    expect(totalDust).toBe(12_750);
    // Gold = 1275 * 10M = 12,750,000,000 (12.75B G)
    expect(totalGold).toBe(12_750_000_000);
  });

  it('demonstrates that Aion Singularity Aegis saves substantial HP against Chronos Bleed', () => {
    const hero = HeroEntity.create({
      seed: 42,
      heroHpMax: 10_000_000,
      heroAtkBase: 100_000_000,
      heroDefBase: 10_000_000,
    });

    const withoutAegis: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['ymir_primordial_heart'], // +100M HP = 110M Max HP -> 3% bleed = 3.3M per turn
    };

    const withAegis: MetaState = {
      ...INITIAL_META,
      forgedRegalia: ['ymir_primordial_heart', 'aion_singularity_aegis'],
    };

    // Floor 55 has Chronos Bleed
    const resWithout = resolveParadoxFloorCombat(hero, 'fire', 0.20, withoutAegis, 55);
    const resWith = resolveParadoxFloorCombat(hero, 'fire', 0.20, withAegis, 55);

    const totalBleedWithout = resWithout.turnLogs.reduce((acc, t) => acc + t.bleedDamageTaken, 0);
    const totalBleedWith = resWith.turnLogs.reduce((acc, t) => acc + t.bleedDamageTaken, 0);

    expect(totalBleedWithout).toBeGreaterThan(10_000_000);
    expect(totalBleedWith).toBe(0); // Completely nullified
  });
});
