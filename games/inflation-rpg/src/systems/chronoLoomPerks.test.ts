/**
 * chronoLoomPerks.test.ts — C1151: Unit tests for Chrono Loom Dynamic Perks Injection.
 */

import { describe, it, expect } from 'vitest';
import {
  applyLoomStatsToHero,
  applyLoomDamageDampening,
  checkLoomFatalGuard,
  resolveLoomLootDuplication,
} from './chronoLoomPerks';
import { INITIAL_META } from '../store/gameStore';
import type { MetaState } from '../types';

describe('C1151: Chrono Loom Dynamic Perks Injection Tests', () => {
  it('applies omni-stat amplification to base HP, ATK, and DEF up to +50%', () => {
    // 1. Rank 0
    const stats0 = applyLoomStatsToHero(1000, 200, 100, INITIAL_META);
    expect(stats0.hp).toBe(1000);
    expect(stats0.atk).toBe(200);
    expect(stats0.def).toBe(100);
    expect(stats0.multiplier).toBe(1.0);

    // 2. Rank 5 (+50%)
    const metaRank5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { temporal_sovereign: 5 },
    };
    const stats5 = applyLoomStatsToHero(1000, 200, 100, metaRank5);
    expect(stats5.hp).toBe(1500);
    expect(stats5.atk).toBe(300);
    expect(stats5.def).toBe(150);
    expect(stats5.multiplier).toBe(1.5);
  });

  it('dampens incoming damage up to 20% accurately', () => {
    expect(applyLoomDamageDampening(10000, INITIAL_META)).toBe(10000);

    const metaRank3: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { singularity_aegis: 3 }, // 3 * 4% = 12%
    };
    expect(applyLoomDamageDampening(10000, metaRank3)).toBe(8800);

    const metaRank5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { singularity_aegis: 5 }, // 20%
    };
    expect(applyLoomDamageDampening(10000, metaRank5)).toBe(8000);
  });

  it('handles fatal damage and triggers fatal guard once per cycle at Rank 5', () => {
    // 1. Non-fatal damage
    const nonFatal = checkLoomFatalGuard(50, 100, INITIAL_META, false);
    expect(nonFatal.survived).toBe(true);
    expect(nonFatal.finalHp).toBe(50);
    expect(nonFatal.guardTriggered).toBe(false);

    // 2. Fatal damage without Rank 5 Aegis
    const fatalNoGuard = checkLoomFatalGuard(200, 100, INITIAL_META, false);
    expect(fatalNoGuard.survived).toBe(false);
    expect(fatalNoGuard.finalHp).toBe(0);
    expect(fatalNoGuard.guardTriggered).toBe(false);

    // 3. Fatal damage with Rank 5 Aegis (first time in cycle)
    const metaAegis5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { singularity_aegis: 5 },
    };
    const fatalWithGuard = checkLoomFatalGuard(200, 100, metaAegis5, false);
    expect(fatalWithGuard.survived).toBe(true);
    expect(fatalWithGuard.finalHp).toBe(1); // retained 1 HP
    expect(fatalWithGuard.guardTriggered).toBe(true);

    // 4. Fatal damage with Rank 5 Aegis when already used in cycle
    const fatalAlreadyUsed = checkLoomFatalGuard(200, 100, metaAegis5, true);
    expect(fatalAlreadyUsed.survived).toBe(false);
    expect(fatalAlreadyUsed.finalHp).toBe(0);
    expect(fatalAlreadyUsed.guardTriggered).toBe(false);
  });

  it('duplicates boss drop loot based on Chrono Duplication probability', () => {
    // Rank 0: 0% duplication
    const noDup = resolveLoomLootDuplication(2, INITIAL_META, 0.05);
    expect(noDup.finalDropCount).toBe(2);
    expect(noDup.isDuplicated).toBe(false);

    // Rank 5: 30% duplication
    const metaDup5: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: { chrono_duplication: 5 },
    };

    // Roll 0.15 < 0.30 -> duplicated!
    const rollSuccess = resolveLoomLootDuplication(2, metaDup5, 0.15);
    expect(rollSuccess.finalDropCount).toBe(4);
    expect(rollSuccess.isDuplicated).toBe(true);

    // Roll 0.50 >= 0.30 -> not duplicated
    const rollFail = resolveLoomLootDuplication(2, metaDup5, 0.50);
    expect(rollFail.finalDropCount).toBe(2);
    expect(rollFail.isDuplicated).toBe(false);
  });
});
