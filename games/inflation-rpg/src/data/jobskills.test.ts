import { describe, it, expect } from 'vitest';
import { ULT_CATALOG, getUltSkillsForChar, getUltById } from './jobskills';

describe('ULT_CATALOG', () => {
  it('has 12 rows total (3 chars × 4)', () => {
    expect(ULT_CATALOG).toHaveLength(12);
  });
  it('every row has charId in {hwarang, mudang, choeui}', () => {
    for (const u of ULT_CATALOG) {
      expect(['hwarang', 'mudang', 'choeui']).toContain(u.charId);
    }
  });
  it('each char has exactly 4 ULTs with ultIndex 1..4', () => {
    for (const charId of ['hwarang', 'mudang', 'choeui'] as const) {
      const ulta = ULT_CATALOG.filter(u => u.charId === charId);
      expect(ulta).toHaveLength(4);
      expect(ulta.map(u => u.ultIndex).sort()).toEqual([1, 2, 3, 4]);
    }
  });
  it('every row has unique id', () => {
    const ids = new Set(ULT_CATALOG.map(u => u.id));
    expect(ids.size).toBe(12);
  });
  it('every row has cooldownSec=8 (base for ULT lv 0)', () => {
    for (const u of ULT_CATALOG) {
      expect(u.cooldownSec).toBe(8);
    }
  });
});

describe('getUltSkillsForChar', () => {
  it('returns 4 ULTs for hwarang', () => {
    expect(getUltSkillsForChar('hwarang')).toHaveLength(4);
  });
  it('returns empty for unknown char', () => {
    expect(getUltSkillsForChar('foo')).toEqual([]);
  });
});

describe('getUltById', () => {
  it('returns ULT row for known id', () => {
    const u = ULT_CATALOG[0]!;
    expect(getUltById(u.id)).toEqual(u);
  });
  it('returns undefined for unknown id', () => {
    expect(getUltById('nope')).toBeUndefined();
  });
});
