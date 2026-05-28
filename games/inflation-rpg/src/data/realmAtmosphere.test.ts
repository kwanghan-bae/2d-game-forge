import { describe, it, expect } from 'vitest';
import { REALM_ATMOSPHERE, getAtmosphereText } from './realmAtmosphere';
import type { RealmId } from '../types';

describe('realmAtmosphere', () => {
  const REALMS: RealmId[] = ['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos'];

  it('all 6 realms have at least 3 atmosphere texts', () => {
    for (const r of REALMS) {
      expect(REALM_ATMOSPHERE[r].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('getAtmosphereText returns a string from pool', () => {
    for (const r of REALMS) {
      const text = getAtmosphereText(r);
      expect(REALM_ATMOSPHERE[r]).toContain(text);
    }
  });
});
