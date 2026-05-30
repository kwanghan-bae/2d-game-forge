/**
 * C729: DestinationBadge — shows AI-chosen destination as pill badge.
 */
import { getDestinationDisplay } from './DestinationBadgeLogic';
import type { LandmarkKind } from '../data/landmarks';

interface DestinationBadgeProps {
  kind: LandmarkKind | null;
}

export function DestinationBadge({ kind }: DestinationBadgeProps) {
  if (!kind) return null;
  const display = getDestinationDisplay(kind);

  return (
    <span
      className="destination-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontSize: '0.75rem',
      }}
    >
      <span>{display.icon}</span>
      <span>{display.label}</span>
    </span>
  );
}
