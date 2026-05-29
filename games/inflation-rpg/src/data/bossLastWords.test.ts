import { describe, it, expect } from 'vitest';
import { BOSS_LAST_WORDS, getBossLastWords } from './bossLastWords';

describe('bossLastWords', () => {
  it('all 6 realm bosses have last words', () => {
    const bossIds = ['base_boss', 'sea_boss', 'volcano_boss', 'underworld_boss', 'heaven_boss', 'chaos_boss'];
    for (const id of bossIds) {
      expect(BOSS_LAST_WORDS[id]).toBeDefined();
      expect(BOSS_LAST_WORDS[id]!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('getBossLastWords returns string from pool', () => {
    const words = getBossLastWords('base_boss');
    expect(words).not.toBeNull();
    expect(BOSS_LAST_WORDS.base_boss).toContain(words);
  });

  it('returns null for unknown boss', () => {
    expect(getBossLastWords('nonexistent')).toBeNull();
  });
});
