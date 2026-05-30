/**
 * C727: EnemyTurnCalc test — pure enemy ATK per turn computation.
 */
import { describe, it, expect } from 'vitest';
import { computeEnemyTurnAtk, type EnemyTurnInput } from '../encounter/EnemyTurnCalc';
import {
  BOSS_RAGE_ATK_PER_TURN,
  BOSS_ENRAGE_ATK_MUL,
  BOSS_ENRAGE_TIMER_TURN,
  BOSS_ENRAGE_TIMER_MUL,
} from '../encounter/constants';

describe('EnemyTurnCalc — computeEnemyTurnAtk', () => {
  const base: EnemyTurnInput = {
    baseEnemyAtk: 100,
    isBoss: false,
    rageTurn: 0,
    currentEnemyHp: 500,
    maxEnemyHp: 1000,
  };

  it('non-boss returns baseEnemyAtk unchanged', () => {
    const result = computeEnemyTurnAtk(base);
    expect(result.rageAtk).toBe(100);
    expect(result.isEnraged).toBe(false);
    expect(result.isTimerEnraged).toBe(false);
  });

  it('boss at rageTurn 0, full HP → base ATK (no rage)', () => {
    const result = computeEnemyTurnAtk({ ...base, isBoss: true, currentEnemyHp: 1000 });
    expect(result.rageAtk).toBe(100);
    expect(result.isEnraged).toBe(false);
  });

  it('boss rage scales with rageTurn', () => {
    const result = computeEnemyTurnAtk({ ...base, isBoss: true, rageTurn: 5, currentEnemyHp: 1000 });
    const expected = Math.floor(100 * (1 + 5 * BOSS_RAGE_ATK_PER_TURN));
    expect(result.rageAtk).toBe(expected);
  });

  it('boss enrages when HP < 50% threshold', () => {
    const result = computeEnemyTurnAtk({ ...base, isBoss: true, rageTurn: 0, currentEnemyHp: 400 });
    expect(result.isEnraged).toBe(true);
    expect(result.rageAtk).toBe(Math.floor(100 * BOSS_ENRAGE_ATK_MUL));
  });

  it('boss timer enrage after BOSS_ENRAGE_TIMER_TURN', () => {
    const result = computeEnemyTurnAtk({
      ...base,
      isBoss: true,
      rageTurn: BOSS_ENRAGE_TIMER_TURN,
      currentEnemyHp: 1000,
    });
    expect(result.isTimerEnraged).toBe(true);
    const expected = Math.floor(100 * (1 + BOSS_ENRAGE_TIMER_TURN * BOSS_RAGE_ATK_PER_TURN) * BOSS_ENRAGE_TIMER_MUL);
    expect(result.rageAtk).toBe(expected);
  });

  it('boss with both enrage + timer enrage stacks multiplicatively', () => {
    const result = computeEnemyTurnAtk({
      ...base,
      isBoss: true,
      rageTurn: BOSS_ENRAGE_TIMER_TURN,
      currentEnemyHp: 100, // below 50%
    });
    expect(result.isEnraged).toBe(true);
    expect(result.isTimerEnraged).toBe(true);
    const expected = Math.floor(
      100 * (1 + BOSS_ENRAGE_TIMER_TURN * BOSS_RAGE_ATK_PER_TURN) * BOSS_ENRAGE_ATK_MUL * BOSS_ENRAGE_TIMER_MUL,
    );
    expect(result.rageAtk).toBe(expected);
  });

  it('non-boss ignores rageTurn and HP state', () => {
    const result = computeEnemyTurnAtk({ ...base, isBoss: false, rageTurn: 20, currentEnemyHp: 1 });
    expect(result.rageAtk).toBe(100);
    expect(result.isEnraged).toBe(false);
    expect(result.isTimerEnraged).toBe(false);
  });

  it('boss at exactly 50% HP is NOT enraged (threshold is <)', () => {
    const result = computeEnemyTurnAtk({ ...base, isBoss: true, currentEnemyHp: 500 });
    expect(result.isEnraged).toBe(false);
  });

  it('boss just below timer threshold is NOT timer enraged', () => {
    const result = computeEnemyTurnAtk({
      ...base,
      isBoss: true,
      rageTurn: BOSS_ENRAGE_TIMER_TURN - 1,
      currentEnemyHp: 1000,
    });
    expect(result.isTimerEnraged).toBe(false);
  });

  // C730: timer enrage constants rebalance regression
  it('BOSS_ENRAGE_TIMER_TURN is 15 (C730)', () => {
    expect(BOSS_ENRAGE_TIMER_TURN).toBe(15);
  });

  it('BOSS_ENRAGE_TIMER_MUL is 1.5 (C730)', () => {
    expect(BOSS_ENRAGE_TIMER_MUL).toBe(1.5);
  });
});
