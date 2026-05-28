import { describe, it, expect } from 'vitest';
import { getCharacterReaction } from './characterReactions';

describe('getCharacterReaction', () => {
  it('returns a warrior reaction for hwarang on region enter', () => {
    const r = getCharacterReaction('hwarang', 'region_enter', 's-region-plains');
    expect(r).toBeTruthy();
    expect(typeof r).toBe('string');
  });

  it('returns a mage reaction for dosa on boss defeat', () => {
    const r = getCharacterReaction('dosa', 'boss_defeat', 's-boss-gumiho');
    expect(r).toBeTruthy();
    expect(typeof r).toBe('string');
  });

  it('returns consistent result for same seed', () => {
    const a = getCharacterReaction('geomgaek', 'region_enter', 's-region-forest');
    const b = getCharacterReaction('geomgaek', 'region_enter', 's-region-forest');
    expect(a).toBe(b);
  });

  it('returns different reactions for different characters', () => {
    const warrior = getCharacterReaction('hwarang', 'region_enter', 's-region-plains');
    const mage = getCharacterReaction('dosa', 'region_enter', 's-region-plains');
    // They could theoretically be the same string but highly unlikely given different pools
    expect(warrior).not.toBe(mage);
  });

  it('returns null for unknown character', () => {
    const r = getCharacterReaction('nonexistent', 'region_enter', 's-region-plains');
    expect(r).toBeNull();
  });
});
