/**
 * C739: TraitInfluenceBadgeLogic — pure logic for trait influence display.
 * Shows which hero traits affected the latest destination choice.
 */
import type { TraitId } from '../cycle/traits';

export interface TraitBadge {
  traitId: TraitId;
  emoji: string;
  label: string;
}

const TRAIT_DISPLAY: Record<string, { emoji: string; label: string }> = {
  t_challenge:       { emoji: '⚔️', label: 'Challenge' },
  t_boss_hunter:     { emoji: '🐉', label: 'Boss Hunter' },
  t_zealot:          { emoji: '🙏', label: 'Zealot' },
  t_swift:           { emoji: '💨', label: 'Swift' },
  t_explorer:        { emoji: '🧭', label: 'Explorer' },
  t_timid:           { emoji: '🐇', label: 'Timid' },
  t_thrill:          { emoji: '🎢', label: 'Thrill' },
  t_miser:           { emoji: '💰', label: 'Miser' },
  t_fortune:         { emoji: '🍀', label: 'Fortune' },
  t_fragile:         { emoji: '🦋', label: 'Fragile' },
  t_berserker:       { emoji: '🔥', label: 'Berserker' },
  t_iron:            { emoji: '🛡️', label: 'Iron' },
  t_prodigy:         { emoji: '📖', label: 'Prodigy' },
  t_lucky:           { emoji: '🎲', label: 'Lucky' },
  t_genius:          { emoji: '🧠', label: 'Genius' },
  t_terminal_genius: { emoji: '💀', label: 'Terminal Genius' },
};

export function getTraitBadges(influencingTraits: readonly TraitId[]): TraitBadge[] {
  const seen = new Set<TraitId>();
  const badges: TraitBadge[] = [];
  for (const t of influencingTraits) {
    if (seen.has(t)) continue;
    seen.add(t);
    const display = TRAIT_DISPLAY[t];
    if (display) {
      badges.push({ traitId: t, emoji: display.emoji, label: display.label });
    }
  }
  return badges;
}
