import { describe, expect, it } from 'vitest';
import { migrateV19ToV20 } from '../gameStore';

describe('migrateV19ToV20', () => {
  it('inserts empty buffLevels when missing', () => {
    const v19 = { meta: { light: 100 } };
    const result = migrateV19ToV20(v19) as { meta: { buffLevels: Record<string, number>; light: number } };
    expect(result.meta.buffLevels).toEqual({});
    expect(result.meta.light).toBe(100);
  });

  it('preserves existing buffLevels (idempotent)', () => {
    const v20 = { meta: { light: 50, buffLevels: { move_speed: 3 } } };
    const result = migrateV19ToV20(v20) as { meta: { buffLevels: Record<string, number> } };
    expect(result.meta.buffLevels).toEqual({ move_speed: 3 });
  });

  it('null meta is safe', () => {
    expect(migrateV19ToV20({ meta: null })).toEqual({ meta: null });
  });

  it('non-object passthrough', () => {
    expect(migrateV19ToV20(null)).toBe(null);
  });
});
