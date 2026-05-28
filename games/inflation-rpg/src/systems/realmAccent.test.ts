import { describe, it, expect } from 'vitest';
import { REALM_ACCENTS } from './realmAccent';
import type { RealmId } from '../types';

describe('realmAccent', () => {
  const ALL_REALMS: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];

  it('every realm has accent and accentDim colors', () => {
    for (const realm of ALL_REALMS) {
      const colors = REALM_ACCENTS[realm];
      expect(colors, `${realm} should have colors`).toBeDefined();
      expect(colors.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.accentDim).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('all accents are distinct', () => {
    const accents = ALL_REALMS.map((r) => REALM_ACCENTS[r].accent);
    expect(new Set(accents).size).toBe(ALL_REALMS.length);
  });
});
