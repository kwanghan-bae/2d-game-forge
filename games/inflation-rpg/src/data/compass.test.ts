import { describe, it, expect } from 'vitest';
import { COMPASS_ITEMS, ALL_COMPASS_IDS, EMPTY_COMPASS_OWNED, getCompassByDungeon } from './compass';
import { DUNGEONS } from './dungeons';

describe('COMPASS_ITEMS data integrity', () => {
  it('omni has dungeonId null and tier 0', () => {
    expect(COMPASS_ITEMS.omni.dungeonId).toBeNull();
    expect(COMPASS_ITEMS.omni.tier).toBe(0);
  });

  it('all entries have non-empty nameKR + descriptionKR + emoji', () => {
    for (const id of ALL_COMPASS_IDS) {
      const entry = COMPASS_ITEMS[id];
      expect(entry.nameKR.length).toBeGreaterThan(0);
      expect(entry.descriptionKR.length).toBeGreaterThan(0);
      expect(entry.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('DUNGEONS ↔ COMPASS_ITEMS coverage', () => {
  // 새 dungeon 이 추가됐을 때 compass 엔트리 (first + second) 누락을 catch.
  // omni 트리거 (newCleared.length >= DUNGEONS.length) 의 silent 미스매치 방어.
  it('every dungeon has both tier-1 and tier-2 compass entries', () => {
    for (const d of DUNGEONS) {
      const firstId = `${d.id}_first`;
      const secondId = `${d.id}_second`;
      expect(ALL_COMPASS_IDS).toContain(firstId);
      expect(ALL_COMPASS_IDS).toContain(secondId);
      expect(COMPASS_ITEMS[firstId as keyof typeof COMPASS_ITEMS]?.dungeonId).toBe(d.id);
      expect(COMPASS_ITEMS[firstId as keyof typeof COMPASS_ITEMS]?.tier).toBe(1);
      expect(COMPASS_ITEMS[secondId as keyof typeof COMPASS_ITEMS]?.dungeonId).toBe(d.id);
      expect(COMPASS_ITEMS[secondId as keyof typeof COMPASS_ITEMS]?.tier).toBe(2);
    }
  });

  it('total compass entries = DUNGEONS.length × 2 + 1 (omni)', () => {
    expect(ALL_COMPASS_IDS.length).toBe(DUNGEONS.length * 2 + 1);
  });
});

describe('EMPTY_COMPASS_OWNED', () => {
  it('has same keys as COMPASS_ITEMS, all false', () => {
    expect(Object.keys(EMPTY_COMPASS_OWNED).sort()).toEqual([...ALL_COMPASS_IDS].sort());
    for (const id of ALL_COMPASS_IDS) {
      expect(EMPTY_COMPASS_OWNED[id]).toBe(false);
    }
  });
});

describe('getCompassByDungeon', () => {
  it('returns first-tier id when tier=1', () => {
    expect(getCompassByDungeon('plains', 1)).toBe('plains_first');
    expect(getCompassByDungeon('forest', 1)).toBe('forest_first');
  });

  it('returns second-tier id when tier=2', () => {
    expect(getCompassByDungeon('plains', 2)).toBe('plains_second');
    expect(getCompassByDungeon('mountains', 2)).toBe('mountains_second');
  });
});
