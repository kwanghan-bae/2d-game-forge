import { describe, it, expect } from 'vitest';
import { getBuffNameKR, getBuffCategory, getAllBuffIds, BUFF_CATALOG } from '../encounter/BuffCatalog';

describe('BuffCatalog', () => {
  it('returns Korean name for known buff', () => {
    expect(getBuffNameKR('merc_shield')).toBe('용병 방패');
    expect(getBuffNameKR('endgame_surge')).toBe('종반 쇄도 ATK');
  });

  it('falls back to ID for unknown buff', () => {
    expect(getBuffNameKR('unknown_buff')).toBe('unknown_buff');
  });

  it('returns category for known buff', () => {
    expect(getBuffCategory('colosseum')).toBe('environment');
    expect(getBuffCategory('rep_atk')).toBe('reputation');
  });

  it('returns undefined category for unknown buff', () => {
    expect(getBuffCategory('nope')).toBeUndefined();
  });

  it('getAllBuffIds returns all registered IDs', () => {
    const ids = getAllBuffIds();
    expect(ids.length).toBeGreaterThan(40);
    expect(ids).toContain('merc_shield');
    expect(ids).toContain('echo_memory');
  });

  it('all catalog entries have non-empty nameKR', () => {
    for (const [id, meta] of Object.entries(BUFF_CATALOG)) {
      expect(meta.nameKR, `buff ${id} has empty name`).not.toBe('');
    }
  });
});
