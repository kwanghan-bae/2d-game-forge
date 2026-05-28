import { describe, it, expect } from 'vitest';
import { EQUIPMENT_FLAVOR } from './equipmentFlavor';
import { EQUIPMENT_BASES } from './equipment';

describe('equipmentFlavor', () => {
  it('every equipment base has a flavor text', () => {
    const missing = EQUIPMENT_BASES.filter(e => !EQUIPMENT_FLAVOR[e.id]);
    expect(missing.map(e => e.id)).toEqual([]);
  });

  it('no flavor text exceeds 50 characters', () => {
    for (const [id, text] of Object.entries(EQUIPMENT_FLAVOR)) {
      expect(text.length, `${id} too long`).toBeLessThanOrEqual(50);
    }
  });

  it('no orphan keys (all flavor keys match a base)', () => {
    const baseIds = new Set(EQUIPMENT_BASES.map(e => e.id));
    const orphans = Object.keys(EQUIPMENT_FLAVOR).filter(k => !baseIds.has(k));
    expect(orphans).toEqual([]);
  });
});
