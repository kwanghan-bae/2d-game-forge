import { describe, it, expect } from 'vitest';
import {
  STARTING_BP,
  onEncounter,
  onDefeat,
  onBossKill,
  isRunOver,
} from './bp';

describe('BP System', () => {
  it('STARTING_BP is 30', () => {
    expect(STARTING_BP).toBe(30);
  });

  it('onEncounter decrements by 1', () => {
    expect(onEncounter(30)).toBe(29);
    expect(onEncounter(1)).toBe(0);
  });

  it('onDefeat normal: additional -2', () => {
    expect(onDefeat(28, false)).toBe(26);
  });

  it('onDefeat hard: additional -4', () => {
    expect(onDefeat(28, true)).toBe(24);
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
