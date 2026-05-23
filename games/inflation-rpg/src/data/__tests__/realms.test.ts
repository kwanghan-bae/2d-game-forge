import { describe, expect, it } from 'vitest';
import { REALM_CATALOG, findRealm } from '../realms';

describe('REALM_CATALOG', () => {
  it('contains 6 entries in order base→sea→volcano→underworld→heaven→chaos', () => {
    expect(REALM_CATALOG).toHaveLength(6);
    expect(REALM_CATALOG.map(r => r.id)).toEqual(['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos']);
  });

  it('column ranges are contiguous and cover 0-120', () => {
    let prevEnd = 0;
    for (const r of REALM_CATALOG) {
      expect(r.columnRange[0]).toBe(prevEnd);
      expect(r.columnRange[1]).toBeGreaterThan(r.columnRange[0]);
      prevEnd = r.columnRange[1];
    }
    expect(prevEnd).toBe(120);
  });

  it('fieldLevelRange is ascending per realm', () => {
    let prevMax = 0;
    for (const r of REALM_CATALOG) {
      expect(r.fieldLevelRange[1]).toBeGreaterThan(r.fieldLevelRange[0]);
      expect(r.fieldLevelRange[0]).toBeGreaterThanOrEqual(prevMax);
      prevMax = r.fieldLevelRange[1];
    }
  });

  it('nextRealm forms a chain ending in chaos', () => {
    expect(REALM_CATALOG[0].nextRealm).toBe('sea');
    expect(REALM_CATALOG[5].nextRealm).toBeNull();
  });

  it('each realm has bossId + enemyRoster + bgColor + nameKR', () => {
    for (const r of REALM_CATALOG) {
      expect(r.bossId).toBeTruthy();
      expect(r.enemyRoster.length).toBeGreaterThan(0);
      expect(r.bgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(r.nameKR).toBeTruthy();
    }
  });

  it('findRealm returns correct entry or throws', () => {
    expect(findRealm('base').nameKR).toBe('시작의 들판');
    expect(() => findRealm('bogus' as 'base')).toThrow();
  });
});
