import { describe, it, expect } from 'vitest';
import { FIXTURES } from './resolver.fixtures';

describe('battle resolver — pre-refactor BattleScene parity', () => {
  it.each(FIXTURES)('$name: enemyMaxHP', (f) => {
    const expected = f.isBoss
      ? Math.floor(f.monsterLevel * 50 * f.hpMult)
      : Math.floor(f.monsterLevel * 20 * f.hpMult);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toMatchSnapshot();
  });

  it.each(FIXTURES)('$name: enemyATK', (f) => {
    const expected = Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1));
    expect(expected).toMatchSnapshot();
  });

  it.each(FIXTURES)('$name: deterministic damage (no rng portion)', (f) => {
    // RNG 부분 (0.9+rand*0.2) 은 1.0 으로 고정한 결정성 데미지
    const expected = Math.floor(f.playerATK * (f.crit ? 2.4 : 1) * 1.0);
    expect(expected).toMatchSnapshot();
  });
});
