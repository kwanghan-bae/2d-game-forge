import { describe, it, expect } from 'vitest';
import { getVictoryQuote } from './victoryQuotes';
import { CHARACTERS } from './characters';

describe('Victory quotes', () => {
  it('all 16 characters have victory quotes', () => {
    for (const char of CHARACTERS) {
      const q = getVictoryQuote(char.id);
      expect(q, `${char.id} has victory quote`).toBeTruthy();
    }
  });

  it('returns null for unknown character', () => {
    expect(getVictoryQuote('unknown_char')).toBeNull();
  });

  it('returns a string', () => {
    const q = getVictoryQuote('hwarang');
    expect(typeof q).toBe('string');
    expect(q!.length).toBeGreaterThan(0);
  });
});
