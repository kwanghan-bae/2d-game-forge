import { describe, it, expect } from 'vitest';
import { BOSS_BATTLE_QUOTES, getBossBattleQuote } from './bossBattleQuotes';

describe('bossBattleQuotes', () => {
  it('covers all 16 characters', () => {
    expect(Object.keys(BOSS_BATTLE_QUOTES)).toHaveLength(16);
  });

  it('each character has at least 2 quotes', () => {
    for (const [, quotes] of Object.entries(BOSS_BATTLE_QUOTES)) {
      expect(quotes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('getBossBattleQuote returns string for known char', () => {
    const q = getBossBattleQuote('hwarang');
    expect(q).not.toBeNull();
    expect(typeof q).toBe('string');
  });

  it('returns null for unknown char', () => {
    expect(getBossBattleQuote('unknown')).toBeNull();
  });
});
