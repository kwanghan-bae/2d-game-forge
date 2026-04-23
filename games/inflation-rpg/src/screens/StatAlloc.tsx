import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { AllocatedStats } from '../types';
import { ForgeButton } from '@/components/ui/forge-button';

const STAT_LABELS: { key: keyof AllocatedStats; label: string; color: string }[] = [
  { key: 'hp',  label: 'HP',  color: 'var(--forge-stat-hp)' },
  { key: 'atk', label: 'ATK', color: 'var(--forge-stat-atk)' },
  { key: 'def', label: 'DEF', color: 'var(--forge-stat-def)' },
  { key: 'agi', label: 'AGI', color: 'var(--forge-stat-agi)' },
  { key: 'luc', label: 'LUC', color: 'var(--forge-stat-luc)' },
];

interface StatAllocProps {
  onClose: () => void;
}

export function StatAlloc({ onClose }: StatAllocProps) {
  const run = useGameStore((s) => s.run);
  const allocateSP = useGameStore((s) => s.allocateSP);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div className="forge-panel" style={{ width: '90%', maxWidth: 340 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>Lv.{run.level} 달성! 스탯 배분</span>
          <span style={{
            background: 'var(--forge-accent-dim)', border: '1px solid var(--forge-accent)',
            borderRadius: 5, padding: '2px 10px', fontSize: 12, color: 'var(--forge-accent)', fontWeight: 700,
          }}>
            SP: {run.statPoints}
          </span>
        </div>

        {STAT_LABELS.map(({ key, label, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 10px', background: 'var(--forge-bg-base)', borderRadius: 6 }}>
            <span style={{ width: 36, fontSize: 12, color: 'var(--forge-text-secondary)', fontWeight: 600 }}>{label}</span>
            <span style={{ width: 56, fontWeight: 700, color, fontSize: 13 }}>{run.allocated[key]}</span>
            <div className="forge-gauge" style={{ flex: 1, height: 6, background: 'var(--forge-border)' }}>
              <div style={{ height: '100%', background: color, width: `${Math.min(100, run.allocated[key] / 10)}%` }} />
            </div>
            <button
              onClick={() => allocateSP(key, 1)}
              disabled={run.statPoints < 1}
              style={{
                width: 24, height: 24, borderRadius: 4,
                border: `1px solid ${run.statPoints > 0 ? 'var(--forge-accent)' : 'var(--forge-border)'}`,
                background: 'var(--forge-bg-card)', color: run.statPoints > 0 ? 'var(--forge-accent)' : 'var(--forge-text-muted)',
                cursor: run.statPoints > 0 ? 'pointer' : 'default', fontSize: 16, lineHeight: 1,
              }}
            >+</button>
          </div>
        ))}

        <ForgeButton
          variant="primary"
          style={{ width: '100%', marginTop: 8, opacity: run.statPoints > 0 ? 0.6 : 1 }}
          onClick={onClose}
        >
          {run.statPoints > 0 ? `확인 (SP ${run.statPoints} 남음)` : '확인'}
        </ForgeButton>
      </div>
    </div>
  );
}
