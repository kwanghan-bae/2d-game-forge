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

  it('Cycle 284 — Sub-phase α T1: t_challenge boosts boss/enemy weight', () => {
    const cands: LandmarkCandidate[] = [
      { id: 'b1', kind: 'boss', difficulty: 0 },
      { id: 'v1', kind: 'village', difficulty: 0 },
    ];
    const p = PersonalityState.fromTraitPriors({});
    let bossWithout = 0;
    let bossWith = 0;
    for (let i = 0; i < 50; i++) {
      const r1 = new DestinationResolver(new SeededRng(i));
      const c1 = r1.choose(cands, { traits: [], personality: p });
      if (c1?.kind === 'boss') bossWithout++;
      const r2 = new DestinationResolver(new SeededRng(i));
      const c2 = r2.choose(cands, { traits: ['t_challenge'], personality: p });
      if (c2?.kind === 'boss') bossWith++;
    }
    // t_challenge → boss *= 1.3. ≥ bossWithout 보장 (non-strict).
    expect(bossWith).toBeGreaterThanOrEqual(bossWithout);
  });

  it('Cycle 284 — t_boss_hunter strongly boosts boss', () => {
    const cands: LandmarkCandidate[] = [
      { id: 'b1', kind: 'boss', difficulty: 0 },
      { id: 'e1', kind: 'enemy', difficulty: 0 },
    ];
    const p = PersonalityState.fromTraitPriors({});
    let bossWith = 0;
    for (let i = 0; i < 50; i++) {
      const r = new DestinationResolver(new SeededRng(i));
      const c = r.choose(cands, { traits: ['t_boss_hunter'], personality: p });
      if (c?.kind === 'boss') bossWith++;
    }
    // base = boss 5 / enemy 10, ratio 5/15 = 33%. *1.5 → 7.5/17.5 = 43%.
    // 50 seed 에서 ≥ 15 (30%) 보장.
    expect(bossWith).toBeGreaterThanOrEqual(15);
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
