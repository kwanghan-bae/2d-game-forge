import { describe, it, expect } from 'vitest';
import { FLOOR_CLEAR_QUOTES, getFloorClearQuote } from './floorClearQuotes';
import { CHARACTERS } from './characters';

describe('floorClearQuotes', () => {
  it('all 16 characters have floor clear quotes', () => {
    for (const char of CHARACTERS) {
      expect(FLOOR_CLEAR_QUOTES[char.id], char.id).toBeDefined();
      expect(FLOOR_CLEAR_QUOTES[char.id]!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('getFloorClearQuote returns string from pool', () => {
    const quote = getFloorClearQuote('hwarang');
    expect(quote).not.toBeNull();
    expect(FLOOR_CLEAR_QUOTES.hwarang).toContain(quote);
  });

  it('returns null for unknown character', () => {
    expect(getFloorClearQuote('nobody')).toBeNull();
  });
});
