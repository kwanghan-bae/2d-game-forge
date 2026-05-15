import { describe, it, expect } from 'vitest';
import { awardMiniBossCompass, awardMajorBossCompass } from './compass';
import { EMPTY_COMPASS_OWNED } from '../data/compass';
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
    expect(patch!.dungeonMiniBossesCleared).toEqual(['plains', 'forest', 'mountains']);
  });

  it('does not set omni when only 2/3 cleared', () => {
    const m = baseMeta();
    const patch = awardMiniBossCompass(m, 'plains');
    expect(patch!.compassOwned!.omni).toBeUndefined();
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
    expect(patch!.compassOwned!.omni).toBeUndefined();
  });
});
