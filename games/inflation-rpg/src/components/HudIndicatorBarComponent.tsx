/**
 * C753: HudIndicatorBarComponent — renders weather, trait, and inspiration badges.
 * Uses buildHudIndicators() from HudIndicatorBar view-model.
 */
import { buildHudIndicators, type HudBadge } from './HudIndicatorBar';
import type { Weather } from '../overworld/encounter/WeatherSystem';
import type { TraitId } from '../cycle/traits';

interface HudIndicatorBarProps {
  weather: Weather;
  isNight?: boolean;
  influencingTraits: readonly TraitId[];
  inspirationRemaining: number;
}

const BADGE_COLORS: Record<HudBadge['type'], string> = {
  weather: 'rgba(30, 60, 120, 0.7)',
  trait: 'rgba(80, 50, 120, 0.7)',
  inspiration: 'rgba(120, 90, 0, 0.7)',
};

export function HudIndicatorBarComponent({ weather, isNight, influencingTraits, inspirationRemaining }: HudIndicatorBarProps) {
  const badges = buildHudIndicators({ weather, isNight, influencingTraits, inspirationRemaining });
  if (badges.length === 0) return null;

  return (
    <div
      data-testid="hud-indicator-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '4px 0',
      }}
    >
      {badges.map((badge, i) => (
        <span
          key={`${badge.type}-${i}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: BADGE_COLORS[badge.type],
            color: '#fff',
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
}
