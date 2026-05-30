import { describe, it, expect } from 'vitest';
import { RelicEffectResolver, RELIC_IDS } from '../encounter/RelicEffectResolver';

function makeResolver(opts: {
  relics?: number[];
  relicLevels?: number[];
  imprintedRelic?: number;
  imprintedRelicLevel?: number;
} = {}) {
  return new RelicEffectResolver({
    relics: opts.relics ?? [],
    relicLevels: opts.relicLevels ?? [],
    imprintedRelic: opts.imprintedRelic ?? -1,
    imprintedRelicLevel: opts.imprintedRelicLevel ?? 0,
  });
}

describe('RelicEffectResolver', () => {
  describe('hasRelic', () => {
    it('returns true if relic is equipped', () => {
      const r = makeResolver({ relics: [0, 2], relicLevels: [1, 1] });
      expect(r.hasRelic(0)).toBe(true);
      expect(r.hasRelic(2)).toBe(true);
      expect(r.hasRelic(1)).toBe(false);
    });

    it('returns true if relic is imprinted', () => {
      const r = makeResolver({ imprintedRelic: 3, imprintedRelicLevel: 2 });
      expect(r.hasRelic(3)).toBe(true);
      expect(r.hasRelic(0)).toBe(false);
    });
  });

  describe('getRelicPower', () => {
    it('returns level for base relic (level 1)', () => {
      const r = makeResolver({ relics: [0], relicLevels: [1] });
      expect(r.getRelicPower(0)).toBe(1);
    });

    it('returns level × (1 + RELIC_UPGRADE_BONUS) for upgraded relic', () => {
      const r = makeResolver({ relics: [0], relicLevels: [3] });
      // level 3 × (1 + 0.5) = 4.5
      expect(r.getRelicPower(0)).toBeCloseTo(4.5);
    });

    it('returns prestige retention × level for imprinted relic', () => {
      const r = makeResolver({ imprintedRelic: 1, imprintedRelicLevel: 4 });
      // RELIC_PRESTIGE_RETENTION (0.20) × 4 = 0.8
      expect(r.getRelicPower(1)).toBeCloseTo(0.8);
    });

    it('returns 0 for missing relic', () => {
      const r = makeResolver();
      expect(r.getRelicPower(5)).toBe(0);
    });
  });

  describe('getRelics (display)', () => {
    it('returns equipped relics with names', () => {
      const r = makeResolver({ relics: [0, 4], relicLevels: [2, 1] });
      const display = r.getRelicsDisplay();
      expect(display).toHaveLength(2);
      expect(display[0]).toEqual({ id: 0, level: 2, name: 'Ember Crown' });
      expect(display[1]).toEqual({ id: 4, level: 1, name: 'Blood Pact' });
    });
  });

  describe('getImprintedRelic', () => {
    it('returns null if no imprint', () => {
      expect(makeResolver().getImprintedRelicDisplay()).toBeNull();
    });

    it('returns imprinted relic info', () => {
      const r = makeResolver({ imprintedRelic: 3, imprintedRelicLevel: 2 });
      expect(r.getImprintedRelicDisplay()).toEqual({ id: 3, name: 'Hourglass' });
    });
  });

  describe('dropRelic', () => {
    it('adds new relic when under capacity (3)', () => {
      const r = makeResolver({ relics: [0, 1], relicLevels: [1, 1] });
      const result = r.dropRelic(2);
      expect(result).toBe(true);
      expect(r.hasRelic(2)).toBe(true);
    });

    it('rejects when at capacity', () => {
      const r = makeResolver({ relics: [0, 1, 2], relicLevels: [1, 1, 1] });
      const result = r.dropRelic(3);
      expect(result).toBe(false);
    });

    it('rejects duplicate', () => {
      const r = makeResolver({ relics: [0], relicLevels: [1] });
      const result = r.dropRelic(0);
      expect(result).toBe(false);
    });
  });

  describe('upgradeRelic', () => {
    it('upgrades relic at given index (max 5)', () => {
      const r = makeResolver({ relics: [0, 1], relicLevels: [1, 4] });
      r.upgradeRelic(0);
      expect(r.getRelicPower(0)).toBeCloseTo(2 * (1 + 0.5)); // level 2 × 1.5 = 3
      r.upgradeRelic(1);
      expect(r.getRelicsDisplay()[1]!.level).toBe(5); // capped
    });
  });

  describe('consumePhoenixFeather', () => {
    it('removes feather relic and returns true', () => {
      const r = makeResolver({ relics: [0, 2, 4], relicLevels: [1, 1, 1] });
      expect(r.consumePhoenixFeather()).toBe(true);
      expect(r.hasRelic(2)).toBe(false);
    });

    it('returns false if no feather', () => {
      const r = makeResolver({ relics: [0], relicLevels: [1] });
      expect(r.consumePhoenixFeather()).toBe(false);
    });
  });

  describe('prestigeImprint', () => {
    it('imprints highest-level relic and clears collection', () => {
      const r = makeResolver({ relics: [0, 3, 5], relicLevels: [1, 4, 2] });
      r.prestigeImprint();
      expect(r.getImprintedRelicDisplay()).toEqual({ id: 3, name: 'Hourglass' });
      expect(r.getRelicsDisplay()).toHaveLength(0);
    });

    it('no-op if no relics', () => {
      const r = makeResolver();
      r.prestigeImprint();
      expect(r.getImprintedRelicDisplay()).toBeNull();
    });
  });

  describe('hourglassDurationMul', () => {
    it('returns HOURGLASS_DURATION_MUL if has hourglass (id=3)', () => {
      const r = makeResolver({ relics: [3], relicLevels: [1] });
      expect(r.hourglassDurationMul()).toBe(1.5); // HOURGLASS_DURATION_MUL = 1.5
    });

    it('returns 1 if no hourglass', () => {
      const r = makeResolver({ relics: [0], relicLevels: [1] });
      expect(r.hourglassDurationMul()).toBe(1);
    });
  });

  describe('snapshot/restore', () => {
    it('snapshot returns state, restore rebuilds', () => {
      const r = makeResolver({ relics: [1, 3], relicLevels: [2, 1], imprintedRelic: 5, imprintedRelicLevel: 3 });
      const snap = r.snapshot();
      const r2 = new RelicEffectResolver(snap);
      expect(r2.hasRelic(1)).toBe(true);
      expect(r2.hasRelic(5)).toBe(true);
      expect(r2.getRelicPower(1)).toBeCloseTo(r.getRelicPower(1));
    });
  });
});
