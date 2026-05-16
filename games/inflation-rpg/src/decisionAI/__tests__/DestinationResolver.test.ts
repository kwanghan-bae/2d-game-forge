import { describe, it, expect } from 'vitest';
import { DestinationResolver, type LandmarkCandidate } from '../DestinationResolver';
import { PersonalityState } from '../../hero/PersonalityState';
import { SeededRng } from '../../cycle/SeededRng';

const candidates = (): LandmarkCandidate[] => [
  { id: 'wolf_1',      kind: 'enemy',  difficulty: 1 },
  { id: 'dragon_1',    kind: 'boss',   difficulty: 5 },
  { id: 'shrine_1',    kind: 'shrine', difficulty: 0 },
  { id: 'village_1',   kind: 'village',difficulty: 0 },
];

describe('DestinationResolver', () => {
  it('returns null when no candidates', () => {
    const r = new DestinationResolver(new SeededRng(1));
    const chosen = r.choose([], { traits: [], personality: new PersonalityState() });
    expect(chosen).toBeNull();
  });

  it('prefers boss when heroic personality is high', () => {
    const r = new DestinationResolver(new SeededRng(1));
    const p = PersonalityState.fromTraitPriors({ heroic: 8 });
    // Run multiple seeds; >50% boss expected
    let bossPicks = 0;
    for (let i = 0; i < 30; i++) {
      const r2 = new DestinationResolver(new SeededRng(i));
      const chosen = r2.choose(candidates(), { traits: [], personality: p });
      if (chosen?.kind === 'boss') bossPicks++;
    }
    expect(bossPicks).toBeGreaterThan(10);
  });

  it('prefers shrine when pious personality is high', () => {
    let shrinePicks = 0;
    const p = PersonalityState.fromTraitPriors({ pious: 8 });
    for (let i = 0; i < 30; i++) {
      const r = new DestinationResolver(new SeededRng(i));
      const chosen = r.choose(candidates(), { traits: [], personality: p });
      if (chosen?.kind === 'shrine') shrinePicks++;
    }
    expect(shrinePicks).toBeGreaterThan(10);
  });

  it('always returns a candidate from the input list', () => {
    const r = new DestinationResolver(new SeededRng(42));
    for (let seed = 0; seed < 20; seed++) {
      const r2 = new DestinationResolver(new SeededRng(seed));
      const chosen = r2.choose(candidates(), { traits: [], personality: new PersonalityState() });
      expect(chosen).not.toBeNull();
      expect(candidates().some(c => c.id === chosen!.id)).toBe(true);
    }
  });
});
