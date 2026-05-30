import { describe, test, expect } from 'vitest';
import { computeAtkBreakdown, type AtkBreakdownResult } from '../../components/AtkBreakdownLogic';

describe('AtkBreakdownLogic', () => {
  test('returns all multiplier categories', () => {
    const result = computeAtkBreakdown({
      flatAtk: 100,
      coreMuls: 2.0,
      conditionMuls: 1.5,
      goldMuls: 1.2,
      combatMuls: 1.1,
      progressMuls: 1.3,
      chainMuls: 1.0,
      tradeoffMuls: 0.9,
      systemMuls: 1.4,
      atkCap: 999999,
    });
    expect(result.finalAtk).toBe(Math.floor(100 * Math.min(999999, 2.0 * 1.5 * 1.2 * 1.1 * 1.3 * 1.0 * 0.9 * 1.4)));
    expect(result.categories).toHaveLength(8);
    expect(result.categories[0].name).toBe('core');
    expect(result.categories[0].value).toBe(2.0);
  });

  test('marks categories > 1 as positive, < 1 as negative', () => {
    const result = computeAtkBreakdown({
      flatAtk: 50,
      coreMuls: 1.0,
      conditionMuls: 0.8,
      goldMuls: 1.5,
      combatMuls: 1.0,
      progressMuls: 1.0,
      chainMuls: 1.0,
      tradeoffMuls: 1.0,
      systemMuls: 1.0,
      atkCap: 999999,
    });
    const condition = result.categories.find(c => c.name === 'condition')!;
    const gold = result.categories.find(c => c.name === 'gold')!;
    expect(condition.sign).toBe('negative');
    expect(gold.sign).toBe('positive');
  });

  test('shows cap active when totalMuls exceeds cap', () => {
    const result = computeAtkBreakdown({
      flatAtk: 100,
      coreMuls: 100,
      conditionMuls: 100,
      goldMuls: 100,
      combatMuls: 1,
      progressMuls: 1,
      chainMuls: 1,
      tradeoffMuls: 1,
      systemMuls: 1,
      atkCap: 500,
    });
    expect(result.capActive).toBe(true);
    expect(result.finalAtk).toBe(Math.floor(100 * 500));
  });
});
