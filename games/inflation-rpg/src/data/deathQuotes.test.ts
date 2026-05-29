import { describe, it, expect } from 'vitest';
import { DEATH_QUOTES, getDeathQuote } from './deathQuotes';

describe('deathQuotes', () => {
  it('has quotes for all 16 characters', () => {
    expect(Object.keys(DEATH_QUOTES)).toHaveLength(16);
  });

  it('each character has exactly 2 quotes', () => {
    for (const [id, quotes] of Object.entries(DEATH_QUOTES)) {
      expect(quotes, `${id} should have 2 quotes`).toHaveLength(2);
      expect(quotes[0].length).toBeGreaterThan(3);
      expect(quotes[1].length).toBeGreaterThan(3);
    }
  });

  it('getDeathQuote returns one of the two quotes', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getDeathQuote('hwarang'));
    }
    expect(results.size).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(DEATH_QUOTES.hwarang).toContain(r);
    }
  });

  it('getDeathQuote returns fallback for unknown character', () => {
    expect(getDeathQuote('unknown')).toBe('…');
  });
});
