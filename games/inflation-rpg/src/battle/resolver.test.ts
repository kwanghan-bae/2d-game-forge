import { describe, it, expect } from 'vitest';
import { FIXTURES } from './resolver.fixtures';
import {
  resolveEnemyMaxHp, resolveEnemyAtk, resolvePlayerHit, resolveDamageTaken,
} from './resolver';

describe('battle resolver — pre-refactor BattleScene parity', () => {
  it.each(FIXTURES)('$name: enemyMaxHP', (f) => {
    const expected = f.isBoss
      ? Math.floor(f.monsterLevel * 50 * f.hpMult)
      : Math.floor(f.monsterLevel * 20 * f.hpMult);
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

  it.each(FIXTURES)('$name: damageTaken', (f) => {
    const enemyATK = Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1));
    const expected = Math.floor(enemyATK * (1 - f.reduction));
    expect(expected).toMatchSnapshot();
  });
});

describe('pure resolver matches inline expectations', () => {
  it.each(FIXTURES)('$name: resolveEnemyMaxHp', (f) => {
    const fromResolver = resolveEnemyMaxHp({
      monsterLevel: f.monsterLevel, isBoss: f.isBoss, hpMult: f.hpMult,
    });
    const inline = f.isBoss
      ? Math.floor(f.monsterLevel * 50 * f.hpMult)
      : Math.floor(f.monsterLevel * 20 * f.hpMult);
    expect(fromResolver).toBe(inline);
  });

  it.each(FIXTURES)('$name: resolveEnemyAtk', (f) => {
    const fromResolver = resolveEnemyAtk({
      monsterLevel: f.monsterLevel, isBoss: f.isBoss,
    });
    expect(fromResolver).toBe(Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1)));
  });

  it.each(FIXTURES)('$name: resolvePlayerHit (rng=0.5 = 1.0 mul)', (f) => {
    const fromResolver = resolvePlayerHit({
      playerATK: f.playerATK, crit: f.crit, rngRoll: 0.5,
    });
    expect(fromResolver).toBe(Math.floor(f.playerATK * (f.crit ? 2.4 : 1) * 1.0));
  });

  it.each(FIXTURES)('$name: resolveDamageTaken', (f) => {
    const enemyATK = Math.floor(f.monsterLevel * 8 * (f.isBoss ? 2 : 1));
    const fromResolver = resolveDamageTaken({ enemyATK, reduction: f.reduction });
    expect(fromResolver).toBe(Math.floor(enemyATK * (1 - f.reduction)));
  });
});

describe('resolvePlayerHit — critMultBonus (Phase G crit_damage)', () => {
  it('default critMultBonus 0 = baseline crit damage', () => {
    const baseline = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5 });
    const same = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5, critMultBonus: 0 });
    expect(same).toBe(baseline);
  });

  it('critMultBonus 1.0 increases crit damage', () => {
    const baseline = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5 });
    const boosted = resolvePlayerHit({ playerATK: 100, crit: true, rngRoll: 0.5, critMultBonus: 1.0 });
    // rngRoll=0.5 → rngMul = 0.9 + 0.5 × 0.2 = 1.0
    // baseline = floor(100 × 2.4 × 1.0) = 240
    // boosted  = floor(100 × (2.4 + 1.0) × 1.0) = floor(100 × 3.4 × 1.0) = 340
    expect(baseline).toBe(240);
    expect(boosted).toBe(340);
  });

  it('critMultBonus ignored when not crit', () => {
    const noCrit = resolvePlayerHit({ playerATK: 100, crit: false, rngRoll: 0.5 });
    const ignored = resolvePlayerHit({ playerATK: 100, crit: false, rngRoll: 0.5, critMultBonus: 5 });
    expect(ignored).toBe(noCrit);
  });
});
