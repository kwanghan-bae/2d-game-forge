import { describe, it, expect } from 'vitest';
import { BATTLE_QUOTES, getBattleQuote } from './battleQuotes';
import { CHARACTERS } from './characters';

describe('battleQuotes', () => {
  it('all 16 characters have battle quotes', () => {
    for (const char of CHARACTERS) {
      expect(BATTLE_QUOTES[char.id]).toBeDefined();
      expect(BATTLE_QUOTES[char.id]!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('getBattleQuote returns a string from pool', () => {
    const quote = getBattleQuote('hwarang');
    expect(BATTLE_QUOTES.hwarang).toContain(quote);
  });

  it('getBattleQuote returns null for unknown character', () => {
    expect(getBattleQuote('unknown_char')).toBeNull();
  });
});
