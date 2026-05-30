import { describe, it, expect } from 'vitest';
import { getTraitBadges } from '../TraitInfluenceBadgeLogic';
import type { TraitId } from '../../cycle/traits';

describe('TraitInfluenceBadgeLogic — C739', () => {
  it('returns empty array when no traits', () => {
    expect(getTraitBadges([])).toEqual([]);
  });

  it('returns badge with emoji and label for known trait', () => {
    const badges = getTraitBadges(['t_boss_hunter'] as TraitId[]);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({ traitId: 't_boss_hunter', emoji: '🐉', label: 'Boss Hunter' });
  });

  it('deduplicates repeated traits', () => {
    const badges = getTraitBadges(['t_challenge', 't_challenge'] as TraitId[]);
    expect(badges).toHaveLength(1);
  });

  it('handles multiple different traits', () => {
    const badges = getTraitBadges(['t_boss_hunter', 't_thrill', 't_berserker'] as TraitId[]);
    expect(badges).toHaveLength(3);
    expect(badges.map(b => b.traitId)).toEqual(['t_boss_hunter', 't_thrill', 't_berserker']);
  });

  it('skips unknown trait ids gracefully', () => {
    const badges = getTraitBadges(['t_unknown_xyz' as TraitId]);
    expect(badges).toEqual([]);
  });
});
