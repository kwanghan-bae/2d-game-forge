/**
 * chaosRiftBossEncounter.test.ts — C1097: Chaos Rift Milestone Elite Boss Encounter Unit Tests.
 */

import { describe, it, expect } from 'vitest';
import {
  ELITE_BOSS_PATTERNS,
  isMilestoneEliteDepth,
  getEliteBossPattern,
  resolveEliteCombat,
} from './chaosRiftBossEncounter';
import type { HeroEntity } from '../hero/HeroEntity';

describe('C1097 [system]: Chaos Rift Elite Boss Encounter Engine', () => {
  const createHero = (atk: number, hp: number, def: number): HeroEntity => ({
    id: 'elite-hunter-hero',
    name: '천외천의 무극신선',
    jobId: 'swordsman',
    level: 150,
    hp,
    hpMax: hp,
    atk,
    def,
    spd: 120,
    critRate: 0.15,
    critDmg: 1.8,
    exp: 0,
    expToNext: 100000,
    gold: 500000,
    cycleCount: 5,
  } as unknown as HeroEntity);

  describe('Pattern Identification', () => {
    it('identifies milestone depths 10, 20, 30, 40, 50', () => {
      expect(isMilestoneEliteDepth(10)).toBe(true);
      expect(isMilestoneEliteDepth(20)).toBe(true);
      expect(isMilestoneEliteDepth(30)).toBe(true);
      expect(isMilestoneEliteDepth(40)).toBe(true);
      expect(isMilestoneEliteDepth(50)).toBe(true);

      expect(isMilestoneEliteDepth(15)).toBe(false);
      expect(isMilestoneEliteDepth(23)).toBe(false);
    });

    it('returns pattern definition with name and special mechanic', () => {
      const p10 = getEliteBossPattern(10);
      expect(p10?.nameKR).toBe('혼돈의 균열 수호거신');
      expect(p10?.specialMechanic).toContain('차원 방벽');

      const p30 = getEliteBossPattern(30);
      expect(p30?.nameKR).toBe('심연의 파멸군주');
      expect(p30?.specialMechanic).toContain('피의 광폭화');
    });
  });

  describe('Elite Combat Mechanics Simulation', () => {
    it('triggers Depth 10 20% shield when boss HP falls below 50%', () => {
      // Moderate hero that takes multiple turns to defeat boss
      const hero = createHero(800000, 1500000, 50000);
      const res = resolveEliteCombat(hero, 10, 'lightning', 0.40, 0.50, 2.0);

      expect(res.won).toBe(true);
      expect(res.shieldTriggered).toBe(true);
      expect(res.damageDealt).toBeGreaterThan(3500000);
    });

    it('triggers Depth 20 element shifts every 3 turns', () => {
      const tankHero = createHero(400000, 3000000, 60000);
      const res = resolveEliteCombat(tankHero, 20, 'fire', 0.45, 0.50, 1.5);

      expect(res.elementShifts).toBeGreaterThanOrEqual(1);
    });

    it('triggers Depth 30 berserk mode when boss HP drops below 30%', () => {
      const hero = createHero(3600000, 3750000, 800000);
      const res = resolveEliteCombat(hero, 30, 'lightning', 0.50, 0.95, 2.60);

      expect(res.won).toBe(true);
      expect(res.berserkTriggered).toBe(true);
    });
  });
});
