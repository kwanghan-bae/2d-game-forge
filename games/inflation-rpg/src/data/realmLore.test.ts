import { describe, it, expect } from 'vitest';
import { REALM_LORE, getRealmLore } from './realmLore';
import type { RealmId } from '../types';

const ALL_REALMS: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];

describe('realmLore', () => {
  it('has lore for all 6 realms', () => {
    expect(Object.keys(REALM_LORE)).toHaveLength(6);
    for (const realm of ALL_REALMS) {
      expect(REALM_LORE[realm].length).toBeGreaterThan(10);
    }
  });

  it('getRealmLore returns correct text', () => {
    expect(getRealmLore('sea')).toContain('바다');
    expect(getRealmLore('volcano')).toContain('용암');
  });

  it('getRealmLore fallback for unknown realm', () => {
    expect(getRealmLore('base')).toContain('시작');
  });
});
