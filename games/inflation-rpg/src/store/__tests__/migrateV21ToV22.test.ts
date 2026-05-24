import { describe, expect, it } from 'vitest';
import { migrateV21ToV22 } from '../gameStore';

describe('migrateV21ToV22', () => {
  it('inserts default season { spring, 0 }', () => {
    const v21 = { meta: { light: 0 }, run: { level: 1 } };
    const r = migrateV21ToV22(v21) as { meta: any };
    expect(r.meta.season).toEqual({ current: 'spring', startedAtAge: 0 });
  });

  it('preserves existing season (idempotent)', () => {
    const v22 = { meta: { season: { current: 'fall', startedAtAge: 30 } } };
    const r = migrateV21ToV22(v22) as { meta: any };
    expect(r.meta.season.current).toBe('fall');
  });

  it('null meta safe', () => {
    expect(migrateV21ToV22({ meta: null })).toEqual({ meta: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV21ToV22(null)).toBe(null);
  });
});
