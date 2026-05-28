import { describe, it, expect } from 'vitest';
import { DUNGEON_INTRO, getDungeonIntro } from './dungeonIntro';

describe('dungeonIntro', () => {
  it('has intro for all 8 dungeons', () => {
    expect(Object.keys(DUNGEON_INTRO).length).toBe(8);
  });

  it('getDungeonIntro returns text for known dungeon', () => {
    expect(getDungeonIntro('plains')).toContain('들판');
  });

  it('getDungeonIntro returns null for unknown dungeon', () => {
    expect(getDungeonIntro('nonexistent')).toBeNull();
  });
});
