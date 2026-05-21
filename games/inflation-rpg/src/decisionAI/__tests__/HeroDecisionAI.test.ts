import { describe, it, expect } from 'vitest';
import { HeroDecisionAI } from '../HeroDecisionAI';
import { HeroEntity } from '../../hero/HeroEntity';
import type { LandmarkCandidate } from '../DestinationResolver';

describe('HeroDecisionAI (v2 / overworld)', () => {
  function makeHero() {
    return HeroEntity.create({ seed: 42, bpMax: 30, heroHpMax: 100, heroAtkBase: 50 });
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
});
