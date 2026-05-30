import React from 'react';
import type { StatDeltaEntry } from './StatDeltaPopupLogic';

const STAT_LABELS: Record<StatDeltaEntry['stat'], string> = {
  exp: 'EXP',
  gold: 'GOLD',
  level: 'LV',
  hp: 'HP',
  crit: 'CRIT',
  damage: 'DMG',
};

function getColor(entry: StatDeltaEntry): string {
  if (entry.isCrit) return 'gold';
  if (entry.sign === '-') return 'red';
  switch (entry.stat) {
    case 'gold': return 'goldenrod';
    case 'hp': return 'limegreen';
    default: return 'green';
  }
}

export interface StatDeltaPopupProps {
  entries: StatDeltaEntry[];
}

export function StatDeltaPopup({ entries }: StatDeltaPopupProps) {
  if (entries.length === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none' }}>
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            color: getColor(entry),
            fontWeight: 'bold',
            fontSize: 14,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {entry.sign}{entry.value} {STAT_LABELS[entry.stat]}
        </div>
      ))}
    </div>
  );
}
