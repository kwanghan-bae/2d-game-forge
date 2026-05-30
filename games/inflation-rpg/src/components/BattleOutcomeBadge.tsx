import React, { useEffect, useState } from 'react';
import { getBattleOutcome, type BattleOutcomeInput } from './BattleOutcomeBadgeLogic';

interface BattleOutcomeBadgeProps {
  input: BattleOutcomeInput | null;
}

const BADGE_DURATION_MS = 1500;

const variantColors: Record<string, string> = {
  quick: '#ffd700',
  endurance: '#87ceeb',
  critical: '#ff4444',
  close: '#ff8c00',
  normal: '#aaaaaa',
};

export function BattleOutcomeBadge({ input }: BattleOutcomeBadgeProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<BattleOutcomeInput | null>(null);

  useEffect(() => {
    if (input) {
      setCurrent(input);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), BADGE_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [input]);

  if (!visible || !current) return null;

  const outcome = getBattleOutcome(current);

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '4px 12px',
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: variantColors[outcome.variant] || '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        pointerEvents: 'none',
        zIndex: 50,
        whiteSpace: 'nowrap',
      }}
    >
      {outcome.icon} {outcome.label}
    </div>
  );
}
