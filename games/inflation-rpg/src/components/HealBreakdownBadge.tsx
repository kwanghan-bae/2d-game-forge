import React from 'react';
import { getHealBreakdown } from './HealBreakdownBadgeLogic';
import type { PostCombatHealResult } from '../overworld/encounter/PostCombatHealCalc';

interface Props {
  healResult: PostCombatHealResult | null;
}

export function HealBreakdownBadge({ healResult }: Props) {
  if (!healResult || healResult.totalHeal === 0) return null;
  const entries = getHealBreakdown(healResult);
  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 28, right: 8,
      display: 'flex', gap: 4, zIndex: 15,
    }}>
      {entries.map(e => (
        <span key={e.source} style={{
          background: 'rgba(0,80,0,0.7)', color: '#7fff7f',
          padding: '2px 6px', borderRadius: 4, fontSize: 11,
        }}>
          {e.icon}+{e.amount}
        </span>
      ))}
    </div>
  );
}
