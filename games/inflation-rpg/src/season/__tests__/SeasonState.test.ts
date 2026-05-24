import { describe, expect, it } from 'vitest';
import { seasonForAge, seasonBonus, SEASON_ORDER } from '../SeasonState';

describe('seasonForAge', () => {
  it('age 0 → spring',           () => expect(seasonForAge(0)).toBe('spring'));
  it('age 14 → spring (boundary)', () => expect(seasonForAge(14)).toBe('spring'));
  it('age 15 → summer',          () => expect(seasonForAge(15)).toBe('summer'));
  it('age 30 → fall',            () => expect(seasonForAge(30)).toBe('fall'));
  it('age 45 → winter',          () => expect(seasonForAge(45)).toBe('winter'));
  it('age 60 → spring (wraps)',  () => expect(seasonForAge(60)).toBe('spring'));
});

describe('seasonBonus', () => {
  it('summer atkMul 1.05', () => expect(seasonBonus('summer').atkMul).toBe(1.05));
  it('fall dropMul 1.1',   () => expect(seasonBonus('fall').dropMul).toBe(1.1));
});

describe('SEASON_ORDER', () => {
  it('has 4 seasons in correct order', () =>
    expect([...SEASON_ORDER]).toEqual(['spring', 'summer', 'fall', 'winter']));
});
