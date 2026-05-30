import { describe, it, expect } from 'vitest';
import { getExpBreakdownDisplay, type ExpBreakdownDisplay } from '../../components/ExpBreakdownBadgeLogic';
import { getEventToastLabel } from '../../components/EventChoiceToastLogic';

describe('ExpBreakdownBadgeLogic', () => {
  it('returns null when top contributor < 20%', () => {
    const result = getExpBreakdownDisplay([
      { name: 'core', value: 1.15 },
      { name: 'combo', value: 1.10 },
      { name: 'combat', value: 1.05 },
    ]);
    expect(result).toBeNull();
  });

  it('returns display when top contributor >= 20% above baseline', () => {
    const result = getExpBreakdownDisplay([
      { name: 'danger', value: 3.5 },
      { name: 'combo', value: 2.1 },
      { name: 'core', value: 1.0 },
    ]);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('danger');
    expect(result!.percent).toBeGreaterThanOrEqual(20);
  });

  it('formats label with category and percent', () => {
    const result = getExpBreakdownDisplay([
      { name: 'combo', value: 4.0 },
      { name: 'core', value: 1.2 },
      { name: 'progress', value: 1.0 },
    ]);
    expect(result!.label).toContain('Combo');
    expect(result!.label).toContain('%');
  });

  it('handles all-1.0 case (no bonus) gracefully', () => {
    const result = getExpBreakdownDisplay([
      { name: 'core', value: 1.0 },
      { name: 'combo', value: 1.0 },
      { name: 'combat', value: 1.0 },
    ]);
    expect(result).toBeNull();
  });
});

describe('EventChoiceToastLogic', () => {
  it('maps merchant buy to Korean label', () => {
    expect(getEventToastLabel('event_merchant_buy')).toContain('상인');
  });

  it('maps gambler win to Korean label', () => {
    expect(getEventToastLabel('event_gambler_win')).toContain('도박');
  });

  it('returns null for unknown event type', () => {
    expect(getEventToastLabel('event_fairy')).toBeNull();
  });
});
