import { describe, it, expect, beforeEach } from 'vitest';
import { ChoiceHistory, classifyChoice } from '../encounter/ChoiceHistory';

describe('ChoiceHistory', () => {
  let history: ChoiceHistory;

  beforeEach(() => {
    history = new ChoiceHistory();
  });

  it('starts empty', () => {
    expect(history.totalChoices).toBe(0);
    expect(history.getDominantStyle()).toBe('balanced');
  });

  it('records and counts by category', () => {
    history.record(60, 'proving', 'accept', 'aggressive');
    history.record(100, 'crossroads', 'atk', 'aggressive');
    history.record(130, 'merchant', 'heal', 'defensive');
    expect(history.countByCategory('aggressive')).toBe(2);
    expect(history.countByCategory('defensive')).toBe(1);
    expect(history.totalChoices).toBe(3);
  });

  it('dominant style is aggressive when most choices aggressive', () => {
    history.record(60, 'proving', 'accept', 'aggressive');
    history.record(100, 'crossroads', 'atk', 'aggressive');
    history.record(130, 'merchant', 'heal', 'defensive');
    expect(history.getDominantStyle()).toBe('aggressive');
  });

  it('returns balanced on tie', () => {
    history.record(60, 'proving', 'accept', 'aggressive');
    history.record(130, 'merchant', 'heal', 'defensive');
    expect(history.getDominantStyle()).toBe('balanced');
  });

  it('reset clears all records', () => {
    history.record(60, 'proving', 'accept', 'aggressive');
    history.reset();
    expect(history.totalChoices).toBe(0);
  });

  it('C972: getConsecutiveDeclines counts trailing defensive choices', () => {
    history.record(10, 'proving', 'accept', 'aggressive');
    history.record(20, 'mercenary', 'accept', 'defensive');
    history.record(30, 'veterans_challenge', 'decline', 'defensive');
    expect(history.getConsecutiveDeclines()).toBe(2);
  });

  it('C972: getConsecutiveDeclines returns 0 when last choice is not defensive', () => {
    history.record(10, 'proving', 'decline', 'defensive');
    history.record(20, 'crossroads', 'atk', 'aggressive');
    expect(history.getConsecutiveDeclines()).toBe(0);
  });
});

describe('classifyChoice', () => {
  it('proving accept = aggressive', () => expect(classifyChoice('proving', 'accept')).toBe('aggressive'));
  it('proving decline = defensive', () => expect(classifyChoice('proving', 'decline')).toBe('defensive'));
  it('mercenary accept = defensive', () => expect(classifyChoice('mercenary', 'accept')).toBe('defensive'));
  it('mercenary decline = greedy', () => expect(classifyChoice('mercenary', 'decline')).toBe('greedy'));
  it('crossroads atk = aggressive', () => expect(classifyChoice('crossroads', 'atk')).toBe('aggressive'));
  it('crossroads exp = greedy', () => expect(classifyChoice('crossroads', 'exp')).toBe('greedy'));
  it('merchant heal = defensive', () => expect(classifyChoice('merchant', 'heal')).toBe('defensive'));
  it('merchant atk = aggressive', () => expect(classifyChoice('merchant', 'atk')).toBe('aggressive'));
  it('merchant gamble = greedy', () => expect(classifyChoice('merchant', 'gamble')).toBe('greedy'));
  it('classifies balance-oriented narrative choices as balanced', () => {
    expect(classifyChoice('first_trial', 'exp')).toBe('balanced');
    expect(classifyChoice('wandering_sage', 'exp')).toBe('balanced');
    expect(classifyChoice('elders_judgment', 'diversify')).toBe('balanced');
  });
});
