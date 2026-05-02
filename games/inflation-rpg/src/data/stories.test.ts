import { describe, it, expect } from 'vitest';
import { STORIES, getRegionEnterStory } from './stories';
import { BOSSES } from './bosses';

describe('stories integrity', () => {
  it('every region_enter story resolves correctly', () => {
    const regionEnterStories = STORIES.filter(s => s.type === 'region_enter');
    expect(regionEnterStories.length).toBeGreaterThan(0);
    for (const story of regionEnterStories) {
      const found = getRegionEnterStory(story.refId);
      expect(found).toBeDefined();
    }
  });

  it('all story IDs are unique', () => {
    const ids = STORIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('boss_defeat stories reference existing bosses', () => {
    const bossIds = new Set(BOSSES.map((b) => b.id));
    const broken: string[] = [];
    for (const story of STORIES) {
      if (story.type === 'boss_defeat' && !bossIds.has(story.refId)) {
        broken.push(`${story.id} -> ${story.refId}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('every story has non-trivial textKR', () => {
    for (const story of STORIES) {
      expect(story.textKR.length, `${story.id}`).toBeGreaterThan(10);
    }
  });
});
