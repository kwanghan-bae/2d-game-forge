import { describe, it, expect } from 'vitest';
import {
  BOSS_INTRO_CATALOG,
  bossIntroSampleSeed,
  findBossIntroBuff,
  sampleBossIntroCards,
} from '../bossIntroCatalog';
import { SeededRng } from '../../cycle/SeededRng';

/**
 * Cycle 109 F1 — bossIntroCatalog tests.
 *
 * PRD §F1.동작(4) invariants:
 *   - catalog has 10 cards × 3 tiers (5/3/2 distribution)
 *   - all weights equal (10 each) → catalog 의 sample 분포 = 소량 50% / 중량 30% / 대량 20%
 *   - sampleBossIntroCards is deterministic per-seed (sim-real parity)
 *   - sample size = 3, no duplicates (without-replacement)
 *   - bossIntroSampleSeed mixes controllerSeed + landmarkId with 0xb0551 constant
 */

describe('BOSS_INTRO_CATALOG', () => {
  it('has exactly 10 entries', () => {
    expect(BOSS_INTRO_CATALOG).toHaveLength(10);
  });

  it('has tier distribution 5 small / 3 mid / 2 big', () => {
    const small = BOSS_INTRO_CATALOG.filter(b => b.tier === 'small');
    const mid = BOSS_INTRO_CATALOG.filter(b => b.tier === 'mid');
    const big = BOSS_INTRO_CATALOG.filter(b => b.tier === 'big');
    expect(small).toHaveLength(5);
    expect(mid).toHaveLength(3);
    expect(big).toHaveLength(2);
  });

  it('all card weights equal 10 (uniform within catalog)', () => {
    for (const b of BOSS_INTRO_CATALOG) {
      expect(b.weight).toBe(10);
    }
  });

  it('card ids are unique', () => {
    const ids = BOSS_INTRO_CATALOG.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('small tier magnitudes ≤ 0.10 (atk/hp/light/move) or ≤ 0.03 (drop_bonus)', () => {
    const small = BOSS_INTRO_CATALOG.filter(b => b.tier === 'small');
    for (const b of small) {
      if (b.effect.kind === 'drop_bonus') {
        expect(b.effect.value).toBeLessThanOrEqual(0.03);
      } else {
        expect(b.effect.value).toBeLessThanOrEqual(0.10);
      }
    }
  });

  it('big tier magnitudes are 0.50 (atk/hp)', () => {
    const big = BOSS_INTRO_CATALOG.filter(b => b.tier === 'big');
    for (const b of big) {
      expect(b.effect.value).toBe(0.50);
    }
  });
});

describe('findBossIntroBuff', () => {
  it('returns the matching catalog entry for each id', () => {
    for (const def of BOSS_INTRO_CATALOG) {
      expect(findBossIntroBuff(def.id)).toBe(def);
    }
  });

  it('throws for unknown id', () => {
    // @ts-expect-error — runtime guard for invalid id
    expect(() => findBossIntroBuff('definitely_not_a_buff')).toThrow();
  });
});

describe('sampleBossIntroCards', () => {
  it('returns exactly 3 cards', () => {
    const sample = sampleBossIntroCards(new SeededRng(1), 3);
    expect(sample).toHaveLength(3);
  });

  it('returns no duplicates (without replacement)', () => {
    const sample = sampleBossIntroCards(new SeededRng(1), 3);
    const ids = sample.map(b => b.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('is deterministic — same seed = same 3-card sample', () => {
    const a = sampleBossIntroCards(new SeededRng(42), 3);
    const b = sampleBossIntroCards(new SeededRng(42), 3);
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
  });

  it('different seeds produce different samples (typically)', () => {
    // Statistical sanity — 10 distinct seeds should not all collide on the
    // same first card. Loose check (any 2 different is enough).
    const firsts = new Set<string>();
    for (let s = 1; s <= 20; s++) {
      firsts.add(sampleBossIntroCards(new SeededRng(s), 3)[0]!.id);
    }
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('throws when count exceeds catalog size', () => {
    expect(() => sampleBossIntroCards(new SeededRng(1), 11)).toThrow();
  });
});

describe('bossIntroSampleSeed', () => {
  it('is deterministic per-(controllerSeed, landmarkId) pair', () => {
    const a = bossIntroSampleSeed(12345, 'boss_dragon_1');
    const b = bossIntroSampleSeed(12345, 'boss_dragon_1');
    expect(a).toBe(b);
  });

  it('different landmarkIds → different seeds (typically)', () => {
    const a = bossIntroSampleSeed(12345, 'boss_dragon_1');
    const b = bossIntroSampleSeed(12345, 'boss_dragon_2');
    expect(a).not.toBe(b);
  });

  it('different controllerSeeds → different seeds (typically)', () => {
    const a = bossIntroSampleSeed(1, 'boss_dragon_1');
    const b = bossIntroSampleSeed(2, 'boss_dragon_1');
    expect(a).not.toBe(b);
  });

  it('returns a non-negative integer (uses unsigned shift)', () => {
    const seed = bossIntroSampleSeed(-1, 'whatever');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(seed)).toBe(true);
  });
});
