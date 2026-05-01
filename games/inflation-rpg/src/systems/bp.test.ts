import { describe, it, expect } from 'vitest';
import {
  STARTING_BP,
  onEncounter,
  onDefeat,
  onBossKill,
  isRunOver,
  encounterCost,
  defeatCost,
} from './bp';

describe('BP System', () => {
  it('STARTING_BP is 30', () => {
    expect(STARTING_BP).toBe(30);
  });

  it('encounterCost = ceil(log10(level)) + 1, min 1', () => {
    expect(encounterCost(1)).toBe(1);       // log10(1)=0 → +1 = 1
    expect(encounterCost(10)).toBe(2);      // log10(10)=1 → +1 = 2
    expect(encounterCost(100)).toBe(3);
    expect(encounterCost(1_000)).toBe(4);
    expect(encounterCost(10_000)).toBe(5);
    expect(encounterCost(1_000_000)).toBe(7);
  });

  it('encounterCost handles level <= 0 gracefully (min 1)', () => {
    expect(encounterCost(0)).toBe(1);
    expect(encounterCost(-5)).toBe(1);
  });

  it('defeatCost = 2 × encounterCost', () => {
    expect(defeatCost(1)).toBe(2);
    expect(defeatCost(100)).toBe(6);
    expect(defeatCost(10_000)).toBe(10);
  });

  it('onEncounter decrements by encounterCost(level)', () => {
    expect(onEncounter(30, 1)).toBe(29);
    expect(onEncounter(30, 100)).toBe(27);     // -3
    expect(onEncounter(30, 1_000_000)).toBe(23); // -7
  });

  it('onDefeat decrements by defeatCost(level), hard mode ×2', () => {
    expect(onDefeat(28, 1, false)).toBe(26);   // -2
    expect(onDefeat(28, 1, true)).toBe(24);    // -4 (hard)
    expect(onDefeat(28, 100, false)).toBe(22); // -6
    expect(onDefeat(28, 100, true)).toBe(16);  // -12
  });

  it('onBossKill adds reward', () => {
    expect(onBossKill(20, 5)).toBe(25);
  });

  it('isRunOver when bp <= 0', () => {
    expect(isRunOver(0)).toBe(true);
    expect(isRunOver(-1)).toBe(true);
    expect(isRunOver(1)).toBe(false);
  });
});
