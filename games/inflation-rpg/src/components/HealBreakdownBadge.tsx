import React from 'react';
import { getHealBreakdown, shouldShowHealBadge } from './HealBreakdownBadgeLogic';
import type { PostCombatHealResult } from '../overworld/encounter/PostCombatHealCalc';

interface Props {
  healResult: PostCombatHealResult | null;
  heroHpMax: number;
}

export function HealBreakdownBadge({ healResult, heroHpMax }: Props) {
  if (!healResult || !shouldShowHealBadge(healResult, heroHpMax)) return null;
  const entries = getHealBreakdown(healResult);
  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 28, right: 8,
      display: 'flex', gap: 4, zIndex: 15,
    }}>
      {entries.map(e => (
        <span key={e.source} style={{
          background: e.isDominant ? 'rgba(0,120,0,0.85)' : 'rgba(0,80,0,0.7)',
          color: '#7fff7f',
          padding: '2px 6px', borderRadius: 4, fontSize: 11,
          fontWeight: e.isDominant ? 700 : 400,
          border: e.isDominant ? '1px solid #7fff7f' : 'none',
        }}>
          {e.icon}+{e.amount}
        </span>
      ))}
    </div>
  );
}
