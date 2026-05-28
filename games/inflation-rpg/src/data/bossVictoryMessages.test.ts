import { describe, it, expect } from 'vitest';
import { getBossVictoryMessage } from './bossVictoryMessages';

describe('bossVictoryMessages', () => {
  it('returns a string for each boss type', () => {
    for (const type of ['mini', 'major', 'sub', 'final'] as const) {
      const msg = getBossVictoryMessage(type);
      expect(msg).toBeTruthy();
      expect(typeof msg).toBe('string');
    }
  });

  it('final boss messages contain special flair', () => {
    // Run multiple times to ensure at least one has emoji/special char
    const msgs = new Set(Array.from({ length: 20 }, () => getBossVictoryMessage('final')));
    const hasSpecial = [...msgs].some(m => m.includes('🌟') || m.includes('!'));
    expect(hasSpecial).toBe(true);
  });
});
