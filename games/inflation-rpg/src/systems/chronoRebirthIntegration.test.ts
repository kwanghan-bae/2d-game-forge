/**
 * chronoRebirthIntegration.test.ts — C1145: Unit tests for Chrono Rebirth Integration.
 */

import { describe, it, expect } from 'vitest';
import {
  getChronoDropMultiplier,
  applyChronoDropMultiplier,
  getRebirthStartingStats,
  applyRebirthToHero,
  calculateRebirthLoot,
  getActiveRebirthTierDef,
} from './chronoRebirthIntegration';
import { INITIAL_META } from '../store/gameStore';
import { HeroEntity } from '../hero/HeroEntity';
import type { MetaState } from '../types';

describe('C1145: Chrono Rebirth Integration Tests', () => {
  it('returns default 1.0 drop multiplier when no rebirth tier is active', () => {
    expect(getChronoDropMultiplier(INITIAL_META)).toBe(1.0);
    expect(getActiveRebirthTierDef(INITIAL_META)).toBeNull();
  });

  it('correctly retrieves drop multipliers for all 4 rebirth tiers', () => {
    const metaApprentice: MetaState = { ...INITIAL_META, activeRebirthTier: 'apprentice_warp' };
    const metaAstral: MetaState = { ...INITIAL_META, activeRebirthTier: 'astral_warp' };
    const metaPrimordial: MetaState = { ...INITIAL_META, activeRebirthTier: 'primordial_warp' };
    const metaSingularity: MetaState = { ...INITIAL_META, activeRebirthTier: 'singularity_rebirth' };

    expect(getChronoDropMultiplier(metaApprentice)).toBe(1.1);
    expect(getChronoDropMultiplier(metaAstral)).toBe(1.25);
    expect(getChronoDropMultiplier(metaPrimordial)).toBe(1.5);
    expect(getChronoDropMultiplier(metaSingularity)).toBe(2.0);
  });

  it('applies drop rate multiplier to base drop bonus accurately', () => {
    const metaAstral: MetaState = { ...INITIAL_META, activeRebirthTier: 'astral_warp' }; // 1.25x
    const metaSingularity: MetaState = { ...INITIAL_META, activeRebirthTier: 'singularity_rebirth' }; // 2.0x

    expect(applyChronoDropMultiplier(0.1, INITIAL_META)).toBe(0.1);
    expect(applyChronoDropMultiplier(0.1, metaAstral)).toBe(0.125);
    expect(applyChronoDropMultiplier(0.1, metaSingularity)).toBe(0.2);
    expect(applyChronoDropMultiplier(0.05, metaSingularity)).toBe(0.1);
  });

  it('resolves starting stats properly via tier ID and via MetaState', () => {
    const defaultStats = getRebirthStartingStats(null);
    expect(defaultStats.startingLevel).toBe(1);
    expect(defaultStats.startingGold).toBe(0);
    expect(defaultStats.dropRateMultiplier).toBe(1.0);

    const astralStats = getRebirthStartingStats('astral_warp');
    expect(astralStats.startingLevel).toBe(100);
    expect(astralStats.startingGold).toBe(15_000_000);
    expect(astralStats.dropRateMultiplier).toBe(1.25);

    const metaSingularity: MetaState = { ...INITIAL_META, activeRebirthTier: 'singularity_rebirth' };
    const singStats = getRebirthStartingStats(metaSingularity);
    expect(singStats.startingLevel).toBe(200);
    expect(singStats.startingGold).toBe(100_000_000);
    expect(singStats.dropRateMultiplier).toBe(2.0);
    expect(singStats.chronoEssenceReward).toBe(5);
  });

  it('elevates newly spawned hero with starting level, gold, and recomputed stats', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 50 });
    expect(hero.level).toBe(1);
    expect(hero.gold).toBe(0);

    const metaPrimordial: MetaState = { ...INITIAL_META, activeRebirthTier: 'primordial_warp' };
    const applied = applyRebirthToHero(hero, metaPrimordial);

    expect(applied).toBe(true);
    expect(hero.level).toBe(150);
    expect(hero.gold).toBe(40_000_000);
    expect(hero.hpMax).toBeGreaterThan(100);
    expect(hero.atk).toBeGreaterThan(50);
    expect(hero.hp).toBe(hero.hpMax);
  });

  it('does not downgrade hero if hero level is already higher than rebirth starting level', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 50 });
    hero.level = 180;
    hero.recomputeStats();

    const metaApprentice: MetaState = { ...INITIAL_META, activeRebirthTier: 'apprentice_warp' }; // startingLevel: 50
    const applied = applyRebirthToHero(hero, metaApprentice);

    expect(applied).toBe(true);
    expect(hero.level).toBe(180); // preserved 180
    expect(hero.gold).toBe(5_000_000);
  });

  it('calculates battle loot correctly with drop odds multiplier', () => {
    const metaSingularity: MetaState = { ...INITIAL_META, activeRebirthTier: 'singularity_rebirth' };
    const loot = calculateRebirthLoot(500, 1200, metaSingularity);

    expect(loot.gold).toBe(500);
    expect(loot.exp).toBe(1200);
    expect(loot.dropOddsMultiplier).toBe(2.0);
  });
});
