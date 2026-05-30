/**
 * C729: DestinationBadgeLogic — pure mapping of LandmarkKind to display info.
 */
import type { LandmarkKind } from '../data/landmarks';

export interface DestinationDisplay {
  icon: string;
  label: string;
}

const KIND_DISPLAY: Record<LandmarkKind, DestinationDisplay> = {
  village:        { icon: '🏘️', label: 'Village' },
  enemy:          { icon: '⚔️', label: 'Battle' },
  boss:           { icon: '👑', label: 'Boss Lair' },
  shrine:         { icon: '🛐', label: 'Shrine' },
  cave:           { icon: '🕳️', label: 'Cave' },
  market:         { icon: '🛒', label: 'Market' },
  ruin:           { icon: '🏛️', label: 'Ruin' },
  exit:           { icon: '🚪', label: 'Exit' },
  rival:          { icon: '🤺', label: 'Rival' },
  watchtower:     { icon: '🗼', label: 'Watchtower' },
  treasure_cave:  { icon: '💎', label: 'Treasure Cave' },
  holy_ruin:      { icon: '⛩️', label: 'Holy Ruin' },
  crossroads:     { icon: '🚦', label: 'Crossroads' },
  sightseeing:    { icon: '🌅', label: 'Scenic Vista' },
  trial:          { icon: '⚡', label: 'Trial' },
};

export function getDestinationDisplay(kind: LandmarkKind): DestinationDisplay {
  return KIND_DISPLAY[kind] ?? { icon: '❓', label: 'Unknown' };
}
