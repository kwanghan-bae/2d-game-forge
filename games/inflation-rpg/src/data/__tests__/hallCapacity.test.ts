import { describe, expect, it } from 'vitest';
import { addHallEntry } from '../hallCapacity';
import {
  HALL_TOP_MAX_LEVEL,
  HALL_TOP_AGE_END,
  HALL_TOP_PER_CAUSE,
  HALL_CAPACITY_HARD_LIMIT,
  type HallEntry,
} from '../hallTypes';

function mkEntry(id: string, opts: Partial<HallEntry> = {}): HallEntry {
  return {
    id,
    cycleId: id,
    heroName: 'hero-' + id,
    maxLevel: 1000,
    ageEnd: 50,
    cause: '자연사',
    realm: 'base',
    finishedAt: 1_000_000,
    ...opts,
  };
}

describe('Cycle 113 N3 — Hall of Sagas capacity policy', () => {
  it('empty hall + add → entries length 1', () => {
    const out = addHallEntry({ entries: [] }, mkEntry('a'));
    expect(out.entries.length).toBe(1);
  });

  it('dedup by id — same id twice = 1 entry (replace)', () => {
    let h: { entries: readonly HallEntry[] } = { entries: [] };
    h = addHallEntry(h, mkEntry('a', { maxLevel: 100 }));
    h = addHallEntry(h, mkEntry('a', { maxLevel: 200 }));
    expect(h.entries.length).toBe(1);
    expect(h.entries[0]!.maxLevel).toBe(200);
  });

  it('top maxLevel — keeps top 50 by maxLevel desc', () => {
    let h: { entries: readonly HallEntry[] } = { entries: [] };
    for (let i = 0; i < 100; i++) {
      h = addHallEntry(h, mkEntry(`m${i}`, { maxLevel: i * 1000, ageEnd: 50, cause: '자연사' }));
    }
    // 100 entries 중 top 50 maxLevel + top 10 age (all same) + per-cause 5
    // 같은 cause 와 같은 age 라서 union 의 크기는 max(50, 10, 5) = 50
    expect(h.entries.length).toBeLessThanOrEqual(HALL_CAPACITY_HARD_LIMIT);
    const top = [...h.entries].sort((a, b) => b.maxLevel - a.maxLevel);
    expect(top[0]!.maxLevel).toBe(99000);
    // top 50 must include entries 50-99
    expect(h.entries.filter(e => e.maxLevel >= 50000).length).toBe(50);
  });

  it('top ageEnd axis — adds elder entry even with low maxLevel', () => {
    let h: { entries: readonly HallEntry[] } = { entries: [] };
    // 50 high-level young entries
    for (let i = 0; i < 50; i++) {
      h = addHallEntry(h, mkEntry(`m${i}`, { maxLevel: 100000 + i, ageEnd: 20, cause: '전사' }));
    }
    // 1 elder entry with low maxLevel
    h = addHallEntry(h, mkEntry('elder', { maxLevel: 5, ageEnd: 80, cause: '자연사' }));
    // elder must survive (top ageEnd axis)
    expect(h.entries.some(e => e.id === 'elder')).toBe(true);
  });

  it('per-cause axis — preserves top 5 per cause', () => {
    let h: { entries: readonly HallEntry[] } = { entries: [] };
    // 100 전사 cause + 6 자연사 cause
    for (let i = 0; i < 100; i++) {
      h = addHallEntry(h, mkEntry(`w${i}`, { maxLevel: 100000 + i, ageEnd: 30, cause: '전사' }));
    }
    for (let i = 0; i < 6; i++) {
      h = addHallEntry(h, mkEntry(`n${i}`, { maxLevel: 100 + i, ageEnd: 70, cause: '자연사' }));
    }
    // top 5 자연사 must be preserved even with low maxLevel
    const naturalEntries = h.entries.filter(e => e.cause === '자연사');
    expect(naturalEntries.length).toBeGreaterThanOrEqual(5);
  });

  it('hard cap — entries ≤ HALL_CAPACITY_HARD_LIMIT', () => {
    let h: { entries: readonly HallEntry[] } = { entries: [] };
    const causes = ['자연사', '전사', '영광스러운죽음', '비극', '무위'] as const;
    for (let i = 0; i < 500; i++) {
      h = addHallEntry(h, mkEntry(`x${i}`, {
        maxLevel: Math.floor(Math.random() * 1000000),
        ageEnd: 20 + Math.floor(Math.random() * 50),
        cause: causes[i % 5],
      }));
    }
    expect(h.entries.length).toBeLessThanOrEqual(HALL_CAPACITY_HARD_LIMIT);
  });

  it('capacity constants — sanity check', () => {
    expect(HALL_TOP_MAX_LEVEL).toBe(50);
    expect(HALL_TOP_AGE_END).toBe(10);
    expect(HALL_TOP_PER_CAUSE).toBe(5);
    expect(HALL_CAPACITY_HARD_LIMIT).toBe(85);
  });
});
