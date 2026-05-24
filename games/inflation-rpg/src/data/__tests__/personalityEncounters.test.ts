import { describe, it, expect } from 'vitest';
import { PERSONALITY_ENCOUNTERS, selectBranch } from '../personalityEncounters';

describe('PERSONALITY_ENCOUNTERS catalog', () => {
  it('has exactly 4 entries — one per non-merciful drift dim', () => {
    expect(PERSONALITY_ENCOUNTERS).toHaveLength(4);
  });

  it('covers heroic / prudent / pious / moral (merciful handled in battle_won proc)', () => {
    const dims = PERSONALITY_ENCOUNTERS.map(e => e.dim).sort();
    expect(dims).toEqual(['heroic', 'moral', 'pious', 'prudent']);
  });

  it('each entry binds a unique LandmarkKind', () => {
    const kinds = PERSONALITY_ENCOUNTERS.map(e => e.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  // cycle 1 F1: holy_ruin positive delta 3 → 2 (asymmetric, mage saturation 완화).
  // 다른 entry 와 모든 negative 분기는 ±3 유지.
  it('positive delta is +3 for all entries except holy_ruin (+2), negative delta is -3 everywhere', () => {
    for (const enc of PERSONALITY_ENCOUNTERS) {
      const expectedPositive = enc.kind === 'holy_ruin' ? 2 : 3;
      expect(enc.positive.delta).toBe(expectedPositive);
      expect(enc.negative.delta).toBe(-3);
    }
  });

  it('both branches have non-empty choice id + nameKR', () => {
    for (const enc of PERSONALITY_ENCOUNTERS) {
      expect(enc.positive.choice).toBeTruthy();
      expect(enc.positive.nameKR).toBeTruthy();
      expect(enc.negative.choice).toBeTruthy();
      expect(enc.negative.nameKR).toBeTruthy();
    }
  });
});

describe('selectBranch', () => {
  const sampleEnc = PERSONALITY_ENCOUNTERS[0]!;

  it('returns positive branch when current >= 0', () => {
    expect(selectBranch(0, sampleEnc).choice).toBe(sampleEnc.positive.choice);
    expect(selectBranch(5, sampleEnc).choice).toBe(sampleEnc.positive.choice);
  });

  it('returns negative branch when current < 0', () => {
    expect(selectBranch(-1, sampleEnc).choice).toBe(sampleEnc.negative.choice);
    expect(selectBranch(-10, sampleEnc).choice).toBe(sampleEnc.negative.choice);
  });
});
