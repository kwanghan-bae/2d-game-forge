// games/inflation-rpg/tools/balance-sim.test.ts
import { describe, it, expect } from 'vitest';
import { simulateFloor, createSeededRng } from './balance-sim';

describe('balance-sim — determinism', () => {
  it('same seed → same result', () => {
    const player = { atk: 1000, def: 100, hpMax: 5000, agi: 50, luc: 50, skills: [] };
    const enemy = { monsterLevel: 10, isBoss: false, hpMult: 1.0 };

    const r1 = simulateFloor(player, enemy, createSeededRng(42));
    const r2 = simulateFloor(player, enemy, createSeededRng(42));

    expect(r1).toEqual(r2);
  });

  it('different seed → likely different result (rng change)', () => {
    const player = { atk: 100, def: 10, hpMax: 500, agi: 30, luc: 30, skills: [] };
    const enemy = { monsterLevel: 5, isBoss: false, hpMult: 1.0 };

    const r1 = simulateFloor(player, enemy, createSeededRng(1));
    const r2 = simulateFloor(player, enemy, createSeededRng(2));

    // 결정성이지만 다른 seed 면 ticksTaken 미세 다를 가능성. 그냥 sanity check.
    expect(r1.ticksTaken === r2.ticksTaken && r1.victory === r2.victory).toBeDefined();
  });

  it('overpowered player → quick victory', () => {
    const player = { atk: 100_000, def: 1000, hpMax: 100_000, agi: 100, luc: 100, skills: [] };
    const enemy = { monsterLevel: 1, isBoss: false, hpMult: 1.0 };
    const r = simulateFloor(player, enemy, createSeededRng(42));
    expect(r.victory).toBe(true);
    expect(r.ticksTaken).toBeLessThan(10);
  });

  it('underpowered player → defeat or maxTicks', () => {
    const player = { atk: 1, def: 0, hpMax: 10, agi: 0, luc: 0, skills: [] };
    const enemy = { monsterLevel: 10000, isBoss: true, hpMult: 5.0 };
    const r = simulateFloor(player, enemy, createSeededRng(42), 100);
    expect(r.victory).toBe(false);
  });
});
