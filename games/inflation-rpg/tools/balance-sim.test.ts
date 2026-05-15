// games/inflation-rpg/tools/balance-sim.test.ts
import { describe, it, expect } from 'vitest';
import { simulateFloor, createSeededRng, type SimPlayer } from './balance-sim';
import type { Modifier } from '../src/types';

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

    // 다른 seed 는 RNG 분기 (crit / combo / playerHit roll) 에서 다른 경로를 탄다.
    // 결과 객체가 완전히 같지 않은지만 확인 — 실제 ticksTaken/victory 가 어떻게
    // 다른지는 case 별. 위 lv5 enemy + 평범한 player 셋업은 RNG 민감 영역이다.
    expect(r1).not.toEqual(r2);
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

describe('simulateFloor — shield modifier fidelity (Phase G Task 12)', () => {
  it('shield modifier reduces incoming damage in sim', () => {
    // Setup: very low hpMax so the base player dies from fatigue accumulation
    // (fatigueDamage/tick = damageTaken * 0.1; lv5 enemy damageTaken ≈ 40 with def=0 → 4/tick)
    // hpMax=20 → base player dies at tick ~5; shielded player absorbs fatigue and can win.
    const enemy = { monsterLevel: 5, isBoss: false, hpMult: 1 };
    const basePlayer: SimPlayer = {
      atk: 5, def: 0, hpMax: 20, agi: 0, luc: 0, skills: [],
    };
    // Shield modifier absorbs 1000 raw damage (large enough to cover all fatigue)
    const shieldedPlayer: SimPlayer = {
      ...basePlayer,
      modifiers: [
        {
          id: 'mod_test_shield', nameKR: '테스트', category: 'defense',
          baseValue: 1000, effectType: 'shield',
          validSlots: ['armor'],
          rarityWeight: { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1, mythic: 1 },
        } as Modifier,
      ],
    };
    const r1 = simulateFloor(basePlayer, enemy, createSeededRng(42));
    const r2 = simulateFloor(shieldedPlayer, enemy, createSeededRng(42));
    // Shield helps player survive longer → r2 should differ in outcome or ticksTaken or remainingHpRatio
    const sameOutcome =
      r1.victory === r2.victory &&
      r1.ticksTaken === r2.ticksTaken &&
      Math.abs(r1.remainingHpRatio - r2.remainingHpRatio) < 1e-9;
    expect(sameOutcome).toBe(false);
  });
});
