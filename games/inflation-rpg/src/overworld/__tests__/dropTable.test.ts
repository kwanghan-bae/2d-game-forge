import { describe, it, expect } from 'vitest';
import { ENEMY_DROPS, BOSS_DROPS, lookupDrop } from '../dropTable';

describe('dropTable', () => {
  it('lookupDrop returns a DropItem for all enemy drop IDs', () => {
    for (const drop of ENEMY_DROPS) {
      const found = lookupDrop(drop.id);
      expect(found).toBeDefined();
      expect(found?.nameKR.length).toBeGreaterThan(0);
    }
  });

  it('lookupDrop returns a DropItem for all boss drop IDs', () => {
    for (const drop of BOSS_DROPS) {
      const found = lookupDrop(drop.id);
      expect(found).toBeDefined();
      expect(found?.nameKR.length).toBeGreaterThan(0);
    }
  });

  it('lookupDrop returns undefined for unknown ID', () => {
    expect(lookupDrop('totally_unknown_item')).toBeUndefined();
  });

  it('enemy drops have Korean names (no raw ASCII)', () => {
    for (const drop of ENEMY_DROPS) {
      // Korean text contains characters above \u0100
      expect([...drop.nameKR].some(c => c.charCodeAt(0) > 0x0100)).toBe(true);
    }
  });

  it('boss drops have Korean names and epic/rare tiers', () => {
    for (const drop of BOSS_DROPS) {
      expect(['rare', 'epic']).toContain(drop.tier);
      expect([...drop.nameKR].some(c => c.charCodeAt(0) > 0x0100)).toBe(true);
    }
  });
});
