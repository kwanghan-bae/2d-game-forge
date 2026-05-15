import { describe, it, expect } from 'vitest';
import { awardMiniBossCompass, awardMajorBossCompass, getDungeonWeight, canFreeSelect, hasAnyFreeSelect, pickRandomDungeon } from './compass';
import { EMPTY_COMPASS_OWNED } from '../data/compass';
import { DUNGEONS } from '../data/dungeons';
import type { MetaState } from '../types';

function baseMeta(): MetaState {
  return {
    compassOwned: { ...EMPTY_COMPASS_OWNED },
    dungeonMiniBossesCleared: [],
    dungeonMajorBossesCleared: [],
  } as unknown as MetaState;
}

describe('awardMiniBossCompass', () => {
  it('first call returns patch with compassOwned[<id>_first] + cleared list updated', () => {
    const m = baseMeta();
    const patch = awardMiniBossCompass(m, 'plains');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.plains_first).toBe(true);
    expect(patch!.dungeonMiniBossesCleared).toEqual(['plains']);
  });

  it('returns null on idempotent re-call', () => {
    const m = baseMeta();
    m.dungeonMiniBossesCleared = ['plains'];
    expect(awardMiniBossCompass(m, 'plains')).toBeNull();
  });

  it('triggers omni when all 3 dungeons cleared', () => {
    const m = baseMeta();
    m.dungeonMiniBossesCleared = ['plains', 'forest'];
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true, forest_first: true };
    const patch = awardMiniBossCompass(m, 'mountains');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.omni).toBe(true);
    expect(patch!.compassOwned!.mountains_first).toBe(true);
    expect(patch!.compassOwned!.plains_first).toBe(true);
    expect(patch!.compassOwned!.forest_first).toBe(true);
    expect(patch!.dungeonMiniBossesCleared).toEqual(['plains', 'forest', 'mountains']);
  });

  it('does not set omni when only 2/3 cleared', () => {
    const m = baseMeta();
    const patch = awardMiniBossCompass(m, 'plains');
    expect(patch!.compassOwned!.omni).toBe(false);
  });
});

describe('awardMajorBossCompass', () => {
  it('first call returns patch with compassOwned[<id>_second] + cleared list updated', () => {
    const m = baseMeta();
    const patch = awardMajorBossCompass(m, 'forest');
    expect(patch).not.toBeNull();
    expect(patch!.compassOwned!.forest_second).toBe(true);
    expect(patch!.dungeonMajorBossesCleared).toEqual(['forest']);
  });

  it('returns null on idempotent re-call', () => {
    const m = baseMeta();
    m.dungeonMajorBossesCleared = ['forest'];
    expect(awardMajorBossCompass(m, 'forest')).toBeNull();
  });

  it('does not affect omni regardless of major-boss progress', () => {
    const m = baseMeta();
    m.dungeonMajorBossesCleared = ['plains', 'forest'];
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true, forest_second: true };
    const patch = awardMajorBossCompass(m, 'mountains');
    expect(patch!.compassOwned!.omni).toBe(false);
  });
});

describe('getDungeonWeight', () => {
  it('returns 3 when first-tier compass owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true };
    expect(getDungeonWeight(m, 'plains')).toBe(3);
  });

  it('returns 1 when first-tier compass not owned', () => {
    const m = baseMeta();
    expect(getDungeonWeight(m, 'forest')).toBe(1);
  });

  it('second-tier owned alone yields weight 1 (no weight boost)', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true };
    expect(getDungeonWeight(m, 'plains')).toBe(1);
  });
});

describe('canFreeSelect', () => {
  it('true when omni owned (any dungeon)', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, omni: true };
    expect(canFreeSelect(m, 'plains')).toBe(true);
    expect(canFreeSelect(m, 'forest')).toBe(true);
  });

  it('true when second-tier owned for that dungeon only', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_second: true };
    expect(canFreeSelect(m, 'plains')).toBe(true);
    expect(canFreeSelect(m, 'forest')).toBe(false);
  });

  it('false when nothing owned', () => {
    const m = baseMeta();
    expect(canFreeSelect(m, 'plains')).toBe(false);
  });
});

describe('hasAnyFreeSelect', () => {
  it('true when omni owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, omni: true };
    expect(hasAnyFreeSelect(m)).toBe(true);
  });

  it('true when any second-tier owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, forest_second: true };
    expect(hasAnyFreeSelect(m)).toBe(true);
  });

  it('false when only first-tier owned', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true, forest_first: true };
    expect(hasAnyFreeSelect(m)).toBe(false);
  });

  it('false when nothing owned', () => {
    const m = baseMeta();
    expect(hasAnyFreeSelect(m)).toBe(false);
  });
});

describe('pickRandomDungeon', () => {
  it('returns a dungeon id from the input list', () => {
    const m = baseMeta();
    const id = pickRandomDungeon(m, DUNGEONS, () => 0.5);
    expect(DUNGEONS.map(d => d.id)).toContain(id);
  });

  it('seeded rng=0 picks first dungeon (uniform weights)', () => {
    const m = baseMeta();
    expect(pickRandomDungeon(m, DUNGEONS, () => 0)).toBe(DUNGEONS[0]!.id);
  });

  it('seeded rng=0.99 picks last dungeon (uniform weights)', () => {
    const m = baseMeta();
    expect(pickRandomDungeon(m, DUNGEONS, () => 0.99)).toBe(DUNGEONS[2]!.id);
  });

  it('weight=3 dungeon dominates distribution over 10000 samples', () => {
    const m = baseMeta();
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, plains_first: true };
    // weights: plains=3, forest=1, mountains=1 → plains expected ~3/5 = 60%
    const counts: Record<string, number> = { plains: 0, forest: 0, mountains: 0 };
    let seed = 1;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 10000; i++) {
      const id = pickRandomDungeon(m, DUNGEONS, rng);
      counts[id]!++;
    }
    expect(counts.plains! / 10000).toBeGreaterThan(0.55);
    expect(counts.plains! / 10000).toBeLessThan(0.65);
    expect(counts.forest! / 10000).toBeGreaterThan(0.15);
    expect(counts.mountains! / 10000).toBeGreaterThan(0.15);
  });
});
