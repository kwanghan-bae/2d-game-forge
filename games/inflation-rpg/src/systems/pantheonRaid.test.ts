/**
 * pantheonRaid.test.ts — C1153: Unit tests for Eternal Pantheon 4-Titan Gauntlet Engine.
 */

import { describe, it, expect } from 'vitest';
import {
  PANTHEON_TITANS,
  TOTAL_PANTHEON_HP,
  checkPantheonEligibility,
  resolvePantheonPhaseCombat,
  resolveFullPantheonRaid,
} from './pantheonRaid';
import { INITIAL_META } from '../store/gameStore';
import { HeroEntity } from '../hero/HeroEntity';
import type { MetaState } from '../types';

describe('C1153: Eternal Pantheon 4-Titan Gauntlet Tests', () => {
  it('defines 4 Cosmic Titans totaling 5.5B HP', () => {
    expect(PANTHEON_TITANS[1].nameKR).toBe('우로보로스');
    expect(PANTHEON_TITANS[1].hp).toBe(500_000_000);

    expect(PANTHEON_TITANS[2].nameKR).toBe('이미르');
    expect(PANTHEON_TITANS[2].hp).toBe(1_000_000_000);

    expect(PANTHEON_TITANS[3].nameKR).toBe('닉스');
    expect(PANTHEON_TITANS[3].hp).toBe(1_500_000_000);

    expect(PANTHEON_TITANS[4].nameKR).toBe('아이온');
    expect(PANTHEON_TITANS[4].hp).toBe(2_500_000_000);

    const sumHp =
      PANTHEON_TITANS[1].hp +
      PANTHEON_TITANS[2].hp +
      PANTHEON_TITANS[3].hp +
      PANTHEON_TITANS[4].hp;

    expect(sumHp).toBe(TOTAL_PANTHEON_HP);
    expect(sumHp).toBe(5_500_000_000);
  });

  it('validates entry eligibility based on rebirth or corridor progress', () => {
    // Ineligible account
    const checkEmpty = checkPantheonEligibility(INITIAL_META);
    expect(checkEmpty.eligible).toBe(false);
    expect(checkEmpty.reason).toContain('시공 환생 1회 이상');

    // Eligible via Rebirth
    const metaRebirth: MetaState = { ...INITIAL_META, totalRebirths: 1 };
    expect(checkPantheonEligibility(metaRebirth).eligible).toBe(true);

    // Eligible via Corridor Sector 5 clear
    const metaCorridor: MetaState = { ...INITIAL_META, corridorSectorsCleared: [1, 2, 3, 4, 5] };
    expect(checkPantheonEligibility(metaCorridor).eligible).toBe(true);
  });

  it('resolves single phase combat with elemental multiplier and loom perks', () => {
    const hero = HeroEntity.create({ seed: 42, heroHpMax: 50_000_000, heroAtkBase: 100_000_000 });
    // Water Titan (Ouroboros) vs Lightning weapon -> 1.5x elemental multiplier
    const result = resolvePantheonPhaseCombat(
      hero,
      1,
      'lightning',
      0.2, // 20% armor DR
      INITIAL_META
    );

    expect(result.phase).toBe(1);
    expect(result.won).toBe(true);
    expect(result.elementalMultiplier).toBe(1.5);
    expect(result.damageDealt).toBeGreaterThan(0);
    expect(result.turns).toBeLessThan(10);
  });

  it('stops raid progression and returns partial progress if hero is defeated', () => {
    // Undergeared hero
    const weakHero = HeroEntity.create({ seed: 1, heroHpMax: 100, heroAtkBase: 10 });
    const raidRes = resolveFullPantheonRaid(weakHero, 'neutral', 0, INITIAL_META);

    expect(raidRes.won).toBe(false);
    expect(raidRes.phasesCleared).toBe(0);
    expect(raidRes.rewards).toBeUndefined();
  });

  it('completes all 4 phases and awards crests, gold, and title when hero is powerful', () => {
    // God-tier endgame hero
    const godHero = HeroEntity.create({
      seed: 777,
      heroHpMax: 200_000_000,
      heroAtkBase: 400_000_000,
    });

    const metaGod: MetaState = {
      ...INITIAL_META,
      chronoLoomRanks: {
        warp_accelerant: 5,
        singularity_aegis: 5,
        chrono_duplication: 5,
        temporal_sovereign: 5,
      },
    };

    const raidRes = resolveFullPantheonRaid(godHero, 'dark', 0.4, metaGod);

    expect(raidRes.won).toBe(true);
    expect(raidRes.phasesCleared).toBe(4);
    expect(raidRes.rewards?.pantheonCrests).toBe(5);
    expect(raidRes.rewards?.goldReward).toBe(500_000_000);
    expect(raidRes.rewards?.titleKR).toContain('진 우주 주재신');
  });
});
