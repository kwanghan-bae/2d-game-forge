import { describe, it, expect } from 'vitest';
import { DestinationResolver, type LandmarkCandidate } from '../DestinationResolver';
import { PersonalityState } from '../../hero/PersonalityState';
import { SeededRng } from '../../cycle/SeededRng';
import type { LandmarkKind } from '../../data/landmarks';

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
    for (let seed = 0; seed < 20; seed++) {
      const r2 = new DestinationResolver(new SeededRng(seed));
      const chosen = r2.choose(candidates(), { traits: [], personality: new PersonalityState() });
      expect(chosen).not.toBeNull();
      expect(candidates().some(c => c.id === chosen!.id)).toBe(true);
    }
  });

  // V1c-1: 새 personality drift 랜드마크 — WEIGHT_BASE 확인 + choose 동작 검증
  it('V1c-1: all new LandmarkKinds have non-zero base weight (choose returns non-null)', () => {
    const newKinds: LandmarkKind[] = ['watchtower', 'treasure_cave', 'holy_ruin', 'crossroads'];
    for (const kind of newKinds) {
      const singleCandidate: LandmarkCandidate[] = [{ id: `${kind}_test`, kind, difficulty: 0 }];
      const r = new DestinationResolver(new SeededRng(1));
      const chosen = r.choose(singleCandidate, { traits: [], personality: new PersonalityState() });
      expect(chosen).not.toBeNull();
      expect(chosen!.kind).toBe(kind);
    }
  });

  it('V1c-1: watchtower preferred by heroic hero over crossroads', () => {
    const heroicCandidates: LandmarkCandidate[] = [
      { id: 'tower_1', kind: 'watchtower', difficulty: 0 },
      { id: 'cross_1', kind: 'crossroads', difficulty: 0 },
    ];
    const p = PersonalityState.fromTraitPriors({ heroic: 8 });
    let towerPicks = 0;
    for (let i = 0; i < 30; i++) {
      const r = new DestinationResolver(new SeededRng(i));
      const chosen = r.choose(heroicCandidates, { traits: [], personality: p });
      if (chosen?.kind === 'watchtower') towerPicks++;
    }
    // heroic=8 → watchtower gets +6.4 on top of base 3 → >50% expected
    expect(towerPicks).toBeGreaterThan(15);
  });

  it('V1c-1: holy_ruin preferred by pious hero', () => {
    const piousCandidates: LandmarkCandidate[] = [
      { id: 'holy_1', kind: 'holy_ruin', difficulty: 0 },
      { id: 'cross_1', kind: 'crossroads', difficulty: 0 },
    ];
    const p = PersonalityState.fromTraitPriors({ pious: 8 });
    let holyPicks = 0;
    for (let i = 0; i < 30; i++) {
      const r = new DestinationResolver(new SeededRng(i));
      const chosen = r.choose(piousCandidates, { traits: [], personality: p });
      if (chosen?.kind === 'holy_ruin') holyPicks++;
    }
    // pious=8 → holy_ruin gets +6.4 on top of base 3 → >50% expected
    expect(holyPicks).toBeGreaterThan(15);
  });
});
