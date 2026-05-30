import { describe, it, expect } from 'vitest';
import { getComboStreakDisplay, ComboStreakVariant } from '../../components/ComboStreakBadgeLogic';

describe('ComboStreakBadgeLogic', () => {
  it('returns idle when combo is 0', () => {
    const result = getComboStreakDisplay(0);
    expect(result.variant).toBe<ComboStreakVariant>('idle');
  });

  it('returns active for combo 1-4', () => {
    const result = getComboStreakDisplay(3);
    expect(result.variant).toBe<ComboStreakVariant>('active');
    expect(result.label).toBe('×3');
  });

  it('returns hot for combo 5-9 (pulse threshold)', () => {
    const result = getComboStreakDisplay(7);
    expect(result.variant).toBe<ComboStreakVariant>('hot');
  });

  it('returns blazing for combo 10+ (color shift)', () => {
    const result = getComboStreakDisplay(15);
    expect(result.variant).toBe<ComboStreakVariant>('blazing');
  });

  it('returns break variant for negative delta', () => {
    const result = getComboStreakDisplay(5, true);
    expect(result.variant).toBe<ComboStreakVariant>('break');
  });
});
