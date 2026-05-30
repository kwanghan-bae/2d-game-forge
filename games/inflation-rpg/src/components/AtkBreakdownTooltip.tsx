import React from 'react';
import type { AtkBreakdownResult } from './AtkBreakdownLogic';

interface Props {
  breakdown: AtkBreakdownResult | null;
}

export function AtkBreakdownTooltip({ breakdown }: Props) {
  if (!breakdown) return null;

  const activeCategories = breakdown.categories.filter(c => c.sign !== 'neutral');

  return (
    <div className="atk-breakdown-tooltip" style={{
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid #666',
      borderRadius: 4,
      padding: '6px 10px',
      fontSize: 12,
      color: '#eee',
      minWidth: 140,
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
        ATK {breakdown.finalAtk}
      </div>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
        기본 {breakdown.flatAtk} × {breakdown.totalMulsCapped.toFixed(1)}
      </div>
      {activeCategories.map(c => (
        <div key={c.name} style={{
          color: c.sign === 'positive' ? '#6f6' : '#f66',
          fontSize: 11,
        }}>
          {c.label}: ×{c.value.toFixed(2)}
        </div>
      ))}
      {breakdown.capActive && (
        <div style={{ color: '#ff6', fontSize: 11, marginTop: 4 }}>
          ⚠ CAP ({breakdown.totalMulsCapped}/{breakdown.totalMulsRaw.toFixed(1)})
        </div>
      )}
    </div>
  );
}
