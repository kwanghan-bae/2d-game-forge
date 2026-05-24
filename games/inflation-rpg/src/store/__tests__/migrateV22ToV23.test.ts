import { describe, expect, it } from 'vitest';
import { migrateV22ToV23 } from '../gameStore';

// Cycle-5 F2 — stale realm bug rescue. Existing v22 saves that froze with
// run.currentRealmId='sea' (or volcano/...) must be forced back to 'base'
// on load so the next OverworldScene render does not pathfinder-lock the
// fresh-spawned hero at base village (col 1).
describe('migrateV22ToV23', () => {
  it('forces run.currentRealmId back to "base" when stale', () => {
    const v22 = { meta: { light: 0 }, run: { currentRealmId: 'sea', npcs: [], level: 1 } };
    const r = migrateV22ToV23(v22) as { run: { currentRealmId: string } };
    expect(r.run.currentRealmId).toBe('base');
  });

  it('is idempotent on a clean v23 state (already base)', () => {
    const v23 = { meta: {}, run: { currentRealmId: 'base', npcs: [] } };
    const r = migrateV22ToV23(v23) as { run: { currentRealmId: string; npcs: unknown[] } };
    expect(r.run.currentRealmId).toBe('base');
    expect(r.run.npcs).toEqual([]);
  });

  it('initializes npcs to [] when missing or non-array', () => {
    const v22 = { run: { currentRealmId: 'volcano' } };
    const r = migrateV22ToV23(v22) as { run: { currentRealmId: string; npcs: unknown[] } };
    expect(r.run.currentRealmId).toBe('base');
    expect(r.run.npcs).toEqual([]);
  });

  it('null run safe', () => {
    expect(migrateV22ToV23({ run: null })).toEqual({ run: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV22ToV23(null)).toBe(null);
  });
});
