import { describe, it, expect } from 'vitest';
import { getBattleOutcome, type BattleOutcomeInput } from '../../components/BattleOutcomeBadgeLogic';

describe('BattleOutcomeBadgeLogic', () => {
  it('quick victory: turnCount <= 2 → "⚡ Quick Victory"', () => {
    const result = getBattleOutcome({ turnCount: 1, didCrit: false, wasCloseCall: false });
    expect(result.label).toContain('Quick');
    expect(result.icon).toBe('⚡');
  });

  it('endurance battle: turnCount >= 10 → "🛡️ Endurance"', () => {
    const result = getBattleOutcome({ turnCount: 12, didCrit: false, wasCloseCall: false });
    expect(result.label).toContain('Endurance');
    expect(result.icon).toBe('🛡️');
  });

  it('crit finish: didCrit=true → "💥 Critical"', () => {
    const result = getBattleOutcome({ turnCount: 5, didCrit: true, wasCloseCall: false });
    expect(result.label).toContain('Critical');
    expect(result.icon).toBe('💥');
  });

  it('close call overrides other badges', () => {
    const result = getBattleOutcome({ turnCount: 5, didCrit: false, wasCloseCall: true });
    expect(result.label).toContain('Close');
    expect(result.icon).toBe('😰');
  });

  it('normal victory: no special conditions → "⚔️ Victory"', () => {
    const result = getBattleOutcome({ turnCount: 5, didCrit: false, wasCloseCall: false });
    expect(result.label).toBe('Victory');
    expect(result.icon).toBe('⚔️');
  });
});
