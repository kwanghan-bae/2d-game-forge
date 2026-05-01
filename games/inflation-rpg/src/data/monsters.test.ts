import { describe, it, expect } from 'vitest';
import { MONSTERS, pickMonsterFromPool, getMonstersForPool } from './monsters';

describe('pickMonsterFromPool', () => {
  it('returns a monster from the given pool whose level range contains the player level', () => {
    const pool = ['plains-imp', 'plains-rat'];
    const m = pickMonsterFromPool(5, pool);
    expect(pool).toContain(m.id);
    expect(m.levelMin).toBeLessThanOrEqual(5);
    expect(m.levelMax).toBeGreaterThanOrEqual(5);
  });

  it('falls back to the closest-matching monster in pool when no exact level match', () => {
    const pool = ['forest-bear', 'forest-fox'];
    const m = pickMonsterFromPool(100, pool);
    expect(['forest-bear', 'forest-fox']).toContain(m.id);
  });

  it('returns first available when pool is otherwise valid', () => {
    const pool = ['slime'];
    const m = pickMonsterFromPool(50, pool);
    expect(m.id).toBe('slime');
  });

  it('throws when pool is empty', () => {
    expect(() => pickMonsterFromPool(5, [])).toThrow();
  });

  it('skips IDs that do not exist in MONSTERS catalog', () => {
    const pool = ['nonexistent-id', 'slime'];
    const m = pickMonsterFromPool(5, pool);
    expect(m.id).toBe('slime');
  });
});

describe('getMonstersForPool', () => {
  it('returns monsters from MONSTERS whose IDs are in pool', () => {
    const pool = ['slime', 'goblin'];
    const result = getMonstersForPool(pool);
    expect(result.map(m => m.id).sort()).toEqual(['goblin', 'slime']);
  });

  it('skips unknown ids', () => {
    const pool = ['slime', 'unknown'];
    const result = getMonstersForPool(pool);
    expect(result.map(m => m.id)).toEqual(['slime']);
  });
});
