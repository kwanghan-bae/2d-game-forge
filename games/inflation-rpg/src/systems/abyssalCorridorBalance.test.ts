/**
 * abyssalCorridorBalance.test.ts — C1125: Balance & Economy Simulation Tests for Abyssal Corridor.
 *
 * Verifies:
 * 1. Sector 1~5 guardian stat monotonicity (HP 400M -> 2B, ATK 7M -> 20M, DEF 350k -> 900k).
 * 2. Environmental hazard mechanics (Sector 2 void erosion & Vega immunity, Sector 4 DEF shred).
 * 3. Undergeared hero survival check (proves endgame gatekeeping).
 * 4. Endgame build simulation: Trinity Harmony + Transmuted Relics + 20 Stars victory in <= 12 turns.
 * 5. Total rewards economy curve across 5 sectors (Starlight Shards, Crack Stones, Dimensional Essence).
 */

import { describe, it, expect } from 'vitest';
import { CORRIDOR_SECTORS, resolveCorridorCombat, type CorridorSectorId } from './abyssalCorridor';
import { HeroEntity } from '../hero/HeroEntity';
import type { AstralResonanceState } from './astralResonanceMatrix';

describe('C1125: Abyssal Corridor Balance & Economy Tests', () => {
  it('strictly enforces monotonic stat scaling across Sectors 1 to 5', () => {
    const sectors: CorridorSectorId[] = [1, 2, 3, 4, 5];

    for (let i = 0; i < sectors.length - 1; i++) {
      const current = CORRIDOR_SECTORS[sectors[i]];
      const next = CORRIDOR_SECTORS[sectors[i + 1]];

      expect(next.maxHp).toBeGreaterThan(current.maxHp);
      expect(next.atk).toBeGreaterThan(current.atk);
      expect(next.def).toBeGreaterThan(current.def);
    }

    // Verify boundary values
    expect(CORRIDOR_SECTORS[1].maxHp).toBe(400_000_000);
    expect(CORRIDOR_SECTORS[5].maxHp).toBe(2_000_000_000);
    expect(CORRIDOR_SECTORS[5].atk).toBe(20_000_000);
  });

  it('validates environmental hazard mechanics and relic counter-measures', () => {
    // Sector 2 void erosion without Vega relic
    const rawHero = HeroEntity.create({
      seed: 101,
      heroHpMax: 10_000_000,
      heroAtkBase: 1_000_000,
      heroDefBase: 1_000_000,
    });

    const resultWithoutVega = resolveCorridorCombat(rawHero, 2, {
      playerDR: 0.5,
      transmutedRelics: [],
    });
    expect(resultWithoutVega.hazardsTriggered).toContain('공허 침식 지속 피해');

    // Sector 2 with Vega relic grants immunity
    const resultWithVega = resolveCorridorCombat(rawHero, 2, {
      playerDR: 0.5,
      transmutedRelics: ['vega_celestial_veil'],
    });
    expect(resultWithVega.hazardsTriggered).toContain('영원의 직녀라: 공허 침식 면역');
    expect(resultWithVega.hazardsTriggered).not.toContain('공허 침식 지속 피해');

    // Sector 4 triggers gravity DEF shred
    const resultSector4 = resolveCorridorCombat(rawHero, 4, {
      playerDR: 0.5,
    });
    expect(resultSector4.hazardsTriggered).toContain('중력 압착 (방어력 50% 삭감)');
  });

  it('proves gatekeeping: undergeared hero fails against Sector 5 Singularity Overlord', () => {
    const undergearedHero = HeroEntity.create({
      seed: 202,
      heroHpMax: 15_000_000,
      heroAtkBase: 8_000_000,
      heroDefBase: 500_000,
    });

    const result = resolveCorridorCombat(undergearedHero, 5, {
      playerDR: 0.20,
      weaponElement: 'neutral',
      transmutedRelics: [],
      mythicStarsTotal: 0,
    });

    expect(result.won).toBe(false);
    expect(result.guardianRemainingHp).toBeGreaterThan(0);
    expect(result.heroRemainingHp).toBe(0);
  });

  it('simulates optimized endgame build defeating Sector 5 Guardian within 12 turns', () => {
    const endgameHero = HeroEntity.create({
      seed: 777,
      heroHpMax: 120_000_000,
      heroAtkBase: 80_000_000,
      heroDefBase: 5_000_000,
    });

    const trinityResonance: AstralResonanceState = {
      totalAffixes: 3,
      distinctAffixes: ['astral_fortitude', 'cosmic_celerity', 'singularity_might'],
      harmonyTier: 2,
      tierNameKR: '삼위일체 성간 조화',
      hanja: '三位一體星間調和',
      badge: '🌌✨👑',
      omniStatMultiplier: 1.25,
      defPierceBonus: 0.15,
      finalDmgMultiplier: 1.20,
      elementalBonus: 0.20,
      dimensionalEvasionChance: 0.15,
    };

    const result = resolveCorridorCombat(endgameHero, 5, {
      weaponElement: 'fire', // Dark clash bonus
      playerDR: 0.70,
      playerElementalBonus: 0.25,
      finalDmgMultiplier: 1.30,
      defPierce: 0.35,
      transmutedRelics: [
        'polaris_celestial_eye',
        'sirius_celestial_fang',
        'vega_celestial_veil',
        'antares_celestial_heart',
      ],
      mythicStarsTotal: 20,
      astralResonance: trinityResonance,
    });

    expect(result.won).toBe(true);
    expect(result.guardianRemainingHp).toBe(0);
    expect(result.turns).toBeLessThanOrEqual(12);
    expect(result.relicsTriggered).toContain('멸겁의 천랑아: 10% 즉사급 피해');
    expect(result.relicsTriggered).toContain('영원의 직녀라: 15% 성막 전개');
    expect(result.rewards).toBeDefined();
    expect(result.rewards?.title).toBe('태초의 승천자 (Primordial Ascendant)');
  });

  it('evaluates cumulative rewards and dimensional essence progression across 5 sectors', () => {
    const sectors: CorridorSectorId[] = [1, 2, 3, 4, 5];
    let totalShards = 0;
    let totalCrackStones = 0;
    let totalEssence = 0;
    let totalGold = 0;

    for (const s of sectors) {
      const rew = CORRIDOR_SECTORS[s].rewards;
      totalShards += rew.starlightShards;
      totalCrackStones += rew.crackStones;
      totalEssence += rew.dimensionalEssence;
      totalGold += rew.gold;
    }

    expect(totalShards).toBe(3_300);
    expect(totalCrackStones).toBe(660);
    expect(totalEssence).toBe(8);
    expect(totalGold).toBe(48_000_000);
    expect(CORRIDOR_SECTORS[5].rewards.title).toBe('태초의 승천자 (Primordial Ascendant)');
  });
});
