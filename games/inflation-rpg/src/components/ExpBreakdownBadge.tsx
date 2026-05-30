import React from 'react';
import { getExpBreakdownDisplay, type ExpBreakdownEntry } from './ExpBreakdownBadgeLogic';

interface Props {
  breakdown: ExpBreakdownEntry[] | null;
}

export function ExpBreakdownBadge({ breakdown }: Props) {
  if (!breakdown) return null;
  const display = getExpBreakdownDisplay(breakdown);
  if (!display) return null;

  return (
    <div style={{
      position: 'absolute', top: 8, right: 8,
      background: 'rgba(0,0,0,0.7)', color: '#ffd700',
      padding: '4px 8px', borderRadius: 4, fontSize: 12,
      transition: 'opacity 0.3s',
    }}>
      {display.label}
    </div>
  );
}
