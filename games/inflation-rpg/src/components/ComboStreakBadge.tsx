import React from 'react';
import { getComboStreakDisplay, ComboStreakVariant } from './ComboStreakBadgeLogic';

interface ComboStreakBadgeProps {
  combo: number;
  isBreaking?: boolean;
}

const VARIANT_COLORS: Record<ComboStreakVariant, string> = {
  idle: 'transparent',
  active: '#4ade80',
  hot: '#f59e0b',
  blazing: '#ef4444',
  break: '#6b7280',
};

export function ComboStreakBadge({ combo, isBreaking = false }: ComboStreakBadgeProps) {
  const display = getComboStreakDisplay(combo, isBreaking);
  if (display.variant === 'idle') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '4px 10px',
        borderRadius: 12,
        backgroundColor: VARIANT_COLORS[display.variant],
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        opacity: 0.9,
        animation: display.variant === 'hot' || display.variant === 'blazing' ? 'pulse 0.6s infinite' : undefined,
        boxShadow: display.glowIntensity > 0 ? `0 0 ${display.glowIntensity * 12}px ${VARIANT_COLORS[display.variant]}` : undefined,
        transition: 'all 0.2s ease',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {display.label}
    </div>
  );
}
