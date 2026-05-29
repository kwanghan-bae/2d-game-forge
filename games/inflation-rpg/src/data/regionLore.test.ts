import { describe, it, expect } from 'vitest';
import { getRegionLore } from './regionLore';

describe('Region lore', () => {
  const regions = ['plains', 'forest', 'mountains', 'sea', 'volcano', 'heaven', 'underworld', 'chaos', 'demon-castle', 'final-realm'];

  it('all 10 regions have lore', () => {
    for (const r of regions) {
      expect(getRegionLore(r), `${r} has lore`).toBeTruthy();
    }
  });

  it('returns null for unknown region', () => {
    expect(getRegionLore('nonexistent')).toBeNull();
  });

  it('returns a non-empty string', () => {
    const lore = getRegionLore('plains');
    expect(typeof lore).toBe('string');
    expect(lore!.length).toBeGreaterThan(10);
  });
});
