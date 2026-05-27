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
