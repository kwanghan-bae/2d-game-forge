import { describe, it, expect } from 'vitest';
import { HeroDecisionAI } from '../HeroDecisionAI';
import { HeroEntity } from '../../hero/HeroEntity';
import type { LandmarkCandidate } from '../DestinationResolver';

describe('HeroDecisionAI (v2 / overworld)', () => {
  function makeHero() {
    return HeroEntity.create({ seed: 42, heroHpMax: 100, heroAtkBase: 50 });
  }

  it('chooseDestination returns one of provided candidates', () => {
    const candidates: LandmarkCandidate[] = [
      { id: 'a', kind: 'enemy', difficulty: 1 },
      { id: 'b', kind: 'village', difficulty: 0 },
    ];
    const ai = new HeroDecisionAI(makeHero(), { seed: 7, traits: [] });
    const choice = ai.chooseDestination(candidates);
    expect(choice).not.toBeNull();
    expect(['a', 'b']).toContain(choice!.id);
  });

  it('chooseDestination returns null on empty list', () => {
    const ai = new HeroDecisionAI(makeHero(), { seed: 7, traits: [] });
    expect(ai.chooseDestination([])).toBeNull();
  });

  it('same seed → same choice', () => {
    const candidates: LandmarkCandidate[] = [
      { id: 'a', kind: 'enemy', difficulty: 1 },
      { id: 'b', kind: 'boss', difficulty: 5 },
      { id: 'c', kind: 'shrine', difficulty: 0 },
    ];
    const a1 = new HeroDecisionAI(makeHero(), { seed: 99, traits: [] }).chooseDestination(candidates);
    const a2 = new HeroDecisionAI(makeHero(), { seed: 99, traits: [] }).chooseDestination(candidates);
    expect(a1?.id).toBe(a2?.id);
  });

  describe('C731: chooseEncounterNode — trait-weighted', () => {
    it('returns one of the provided candidates (non-null)', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      const candidates: LandmarkCandidate[] = [
        { id: 'a', kind: 'enemy', difficulty: 1 },
        { id: 'b', kind: 'shrine', difficulty: 0 },
        { id: 'c', kind: 'boss', difficulty: 5 },
      ];
      const result = ai.chooseEncounterNode(candidates);
      expect(result).not.toBeNull();
      expect(['a', 'b', 'c']).toContain(result!.id);
    });

    it('empty → null', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.chooseEncounterNode([])).toBeNull();
    });

    it('same seed → same choice (deterministic)', () => {
      const candidates: LandmarkCandidate[] = [
        { id: 'a', kind: 'enemy', difficulty: 1 },
        { id: 'b', kind: 'boss', difficulty: 5 },
        { id: 'c', kind: 'shrine', difficulty: 0 },
      ];
      const r1 = new HeroDecisionAI(makeHero(), { seed: 42, traits: [] }).chooseEncounterNode(candidates);
      const r2 = new HeroDecisionAI(makeHero(), { seed: 42, traits: [] }).chooseEncounterNode(candidates);
      expect(r1?.id).toBe(r2?.id);
    });

    it('boss_hunter trait biases toward boss nodes', () => {
      const candidates: LandmarkCandidate[] = [
        { id: 'e1', kind: 'enemy', difficulty: 1 },
        { id: 'b1', kind: 'boss', difficulty: 5 },
        { id: 'v1', kind: 'village', difficulty: 0 },
      ];
      // Run multiple seeds and count boss selections
      let bossCount = 0;
      for (let seed = 0; seed < 50; seed++) {
        const ai = new HeroDecisionAI(makeHero(), { seed, traits: ['t_boss_hunter'] });
        const result = ai.chooseEncounterNode(candidates);
        if (result?.kind === 'boss') bossCount++;
      }
      // With boss_hunter trait, boss should be selected significantly more than 1/3
      expect(bossCount).toBeGreaterThan(20);
    });
  });

  describe('Cycle 302 — Sub-phase δ T1: chooseTargetEnemyId', () => {
    const enemies = [
      { id: 'weak', difficulty: 1 },
      { id: 'mid', difficulty: 5 },
      { id: 'strong', difficulty: 10 },
    ];

    it('default → 가장 약한 적 (focus weak first)', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.chooseTargetEnemyId(enemies)).toBe('weak');
    });

    it('t_boss_hunter → 가장 강한 적', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: ['t_boss_hunter'] });
      expect(ai.chooseTargetEnemyId(enemies)).toBe('strong');
    });

    it('empty → null', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.chooseTargetEnemyId([])).toBeNull();
    });
  });

  describe('Cycle 301 — Sub-phase γ T1: shouldRetreat', () => {
    it('HP < 0.2 → 항상 retreat', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.shouldRetreat({ hpRatio: 0.1, enemyDifficulty: 1, heroLevel: 50 })).toBe(true);
    });

    it('HP < 0.4 + enemy > heroLevel → retreat', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.shouldRetreat({ hpRatio: 0.3, enemyDifficulty: 60, heroLevel: 50 })).toBe(true);
    });

    it('HP < 0.4 but enemy ≤ heroLevel → no retreat', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.shouldRetreat({ hpRatio: 0.3, enemyDifficulty: 30, heroLevel: 50 })).toBe(false);
    });

    it('HP healthy → no retreat', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.shouldRetreat({ hpRatio: 0.9, enemyDifficulty: 99, heroLevel: 50 })).toBe(false);
    });
  });

  describe('Cycle 295 — Sub-phase β T1: chooseSkillId', () => {
    it('HP critical (<0.4) + heal available → heal 우선', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      const skill = ai.chooseSkillId(['strike', 'heal', 'fireball'], { hpRatio: 0.3, isBossTarget: false });
      expect(skill).toBe('heal');
    });

    it('HP critical + bless (no heal) → bless 우선', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      const skill = ai.chooseSkillId(['strike', 'bless'], { hpRatio: 0.2, isBossTarget: false });
      expect(skill).toBe('bless');
    });

    it('boss target + divine_judgment available → judgment 우선', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      const skill = ai.chooseSkillId(['strike', 'divine_judgment'], { hpRatio: 0.9, isBossTarget: true });
      expect(skill).toBe('divine_judgment');
    });

    it('일반 (HP healthy, non-boss) → first available', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      const skill = ai.chooseSkillId(['strike', 'fireball'], { hpRatio: 0.9, isBossTarget: false });
      expect(skill).toBe('strike');
    });

    it('empty list → null', () => {
      const ai = new HeroDecisionAI(makeHero(), { seed: 1, traits: [] });
      expect(ai.chooseSkillId([], { hpRatio: 1, isBossTarget: false })).toBeNull();
    });
  });
});
