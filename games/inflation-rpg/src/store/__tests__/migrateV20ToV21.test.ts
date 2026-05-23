import { describe, expect, it } from 'vitest';
import { migrateV20ToV21 } from '../gameStore';

describe('migrateV20ToV21', () => {
  it('inserts default unlockedRealms + eternalSaga + currentRealmId + npcs', () => {
    const v20 = { meta: { light: 0, buffLevels: {} }, run: { level: 1 } };
    const r = migrateV20ToV21(v20) as { meta: any; run: any };
    expect(r.meta.unlockedRealms).toEqual(['base']);
    expect(r.meta.eternalSaga).toEqual({ events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] });
    expect(r.run.currentRealmId).toBe('base');
    expect(r.run.npcs).toEqual([]);
  });

  it('preserves existing fields (idempotent)', () => {
    const v21 = {
      meta: { unlockedRealms: ['base', 'sea'], eternalSaga: { events: [{ x: 1 }], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] } },
      run: { currentRealmId: 'sea', npcs: [{ id: 'n1' }] },
    };
    const r = migrateV20ToV21(v21) as { meta: any; run: any };
    expect(r.meta.unlockedRealms).toEqual(['base', 'sea']);
    expect(r.meta.eternalSaga.events).toHaveLength(1);
    expect(r.run.currentRealmId).toBe('sea');
    expect(r.run.npcs).toHaveLength(1);
  });

  it('null meta + run safe', () => {
    expect(migrateV20ToV21({ meta: null, run: null })).toEqual({ meta: null, run: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV20ToV21(null)).toBe(null);
  });
});
