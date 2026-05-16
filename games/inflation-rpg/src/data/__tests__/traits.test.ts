import { describe, it, expect } from 'vitest';
import { TRAIT_CATALOG, TRAIT_IDS } from '../traits';

describe('TRAIT_CATALOG', () => {
  it('has 16 entries matching spec §16', () => {
    expect(TRAIT_IDS.length).toBe(16);
  });

  it('all entries have unique ids', () => {
    const ids = new Set(TRAIT_IDS);
    expect(ids.size).toBe(TRAIT_IDS.length);
  });

  it('every catalog entry has nameKR + descKR + unlockTier + mods', () => {
    for (const id of TRAIT_IDS) {
      const t = TRAIT_CATALOG[id];
      expect(t.nameKR.length).toBeGreaterThan(0);
      expect(t.descKR.length).toBeGreaterThan(0);
      expect(['base', 'mid', 'rare']).toContain(t.unlockTier);
      expect(typeof t.mods).toBe('object');
    }
  });

  it('contains the 6 user-cited examples (도전적/소극적/위험을즐김/천재/허약함/시한부역대급천재)', () => {
    expect(TRAIT_CATALOG.t_challenge.nameKR).toBe('도전적');
    expect(TRAIT_CATALOG.t_timid.nameKR).toBe('소극적');
    expect(TRAIT_CATALOG.t_thrill.nameKR).toBe('위험을 즐김');
    expect(TRAIT_CATALOG.t_genius.nameKR).toBe('천재');
    expect(TRAIT_CATALOG.t_fragile.nameKR).toBe('허약함');
    expect(TRAIT_CATALOG.t_terminal_genius.nameKR).toBe('시한부 역대급 천재');
  });

  it('t_terminal_genius has bpCostMul = 2 (per spec — strong cost)', () => {
    expect(TRAIT_CATALOG.t_terminal_genius.mods.bpCostMul).toBe(2);
  });

  it('base-tier traits are at least 7 (initial unlock pool)', () => {
    const base = TRAIT_IDS.filter(id => TRAIT_CATALOG[id].unlockTier === 'base');
    expect(base.length).toBeGreaterThanOrEqual(7);
  });
});
