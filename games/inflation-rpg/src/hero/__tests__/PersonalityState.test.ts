import { describe, it, expect } from 'vitest';
import { PersonalityState, PERSONALITY_DIMS, type PersonalityDim } from '../PersonalityState';

describe('PersonalityState', () => {
  it('starts all dims at 0 (neutral)', () => {
    const p = new PersonalityState();
    for (const dim of PERSONALITY_DIMS) {
      expect(p.get(dim)).toBe(0);
    }
  });

  it('applies trait priors via fromTraitPriors', () => {
    const p = PersonalityState.fromTraitPriors({ moral: 5, prudent: -3 });
    expect(p.get('moral')).toBe(5);
    expect(p.get('prudent')).toBe(-3);
    expect(p.get('heroic')).toBe(0);
  });

  it('adjust clamps to [-10, +10]', () => {
    const p = new PersonalityState();
    p.adjust('moral', 7);
    p.adjust('moral', 5);
    expect(p.get('moral')).toBe(10);
    p.adjust('prudent', -7);
    p.adjust('prudent', -10);
    expect(p.get('prudent')).toBe(-10);
  });

  it('snapshot returns immutable copy', () => {
    const p = new PersonalityState();
    p.adjust('moral', 3);
    const snap = p.snapshot();
    p.adjust('moral', 5);
    expect(snap.moral).toBe(3);
    expect(p.get('moral')).toBe(8);
  });

  it('all 5 dimensions are exported in PERSONALITY_DIMS', () => {
    expect(PERSONALITY_DIMS).toEqual(['moral', 'prudent', 'heroic', 'merciful', 'pious']);
  });
});
