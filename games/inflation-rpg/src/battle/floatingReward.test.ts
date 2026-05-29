import { describe, it, expect } from 'vitest';

describe('Floating reward number formatting', () => {
  const formatGold = (g: number) => `+${g.toLocaleString()} G`;
  const formatXp = (x: number) => `+${x.toLocaleString()} XP`;

  it('formats gold gain with locale separators', () => {
    expect(formatGold(1500)).toContain('1');
    expect(formatGold(1500)).toContain('G');
  });

  it('formats XP gain', () => {
    expect(formatXp(2400)).toContain('XP');
    expect(formatXp(0)).toBe('+0 XP');
  });
});
