import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { HallEntry } from '../data/hallTypes';

interface Props {
  onClose: () => void;
}

type SortKey = 'maxLevel' | 'ageEnd' | 'finishedAt';

const SORT_LABEL_KR: Record<SortKey, string> = {
  maxLevel: '레벨',
  ageEnd: '나이',
  finishedAt: '최신',
};

const CAUSE_EMOJI: Record<string, string> = {
  '자연사': '🌿',
  '전사': '⚔️',
  '영광스러운죽음': '✨',
  '비극': '💀',
  '무위': '🌫️',
};

/**
 * Cycle 114 N3 — Hall of Sagas top 5 view.
 *
 * 모든 cycle 종료 시 자동 등록된 HallEntry 의 top 5 by 선택된 sort axis.
 * 빈 hall = "아직 기록이 없다" placeholder.
 */
export function HallScreen({ onClose }: Props) {
  const hall = useGameStore(s => s.meta.hall ?? { entries: [] });
  const [sortKey, setSortKey] = useState<SortKey>('maxLevel');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = useMemo<readonly HallEntry[]>(() => {
    return [...hall.entries].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 5);
  }, [hall.entries, sortKey]);

  return (
    <div
      data-testid="hall-modal-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        data-testid="hall-modal"
        style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>전당 (Hall of Sagas)</strong>
          <span style={{ fontSize: 12, color: '#aaa' }}>{hall.entries.length} 기록</span>
          <button type="button" data-testid="hall-modal-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['maxLevel', 'ageEnd', 'finishedAt'] as SortKey[]).map(k => (
            <button
              key={k}
              type="button"
              data-testid={`hall-sort-${k}`}
              onClick={() => setSortKey(k)}
              style={{ padding: '4px 8px', background: sortKey === k ? '#3b4252' : '#262830', color: '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
            >
              {SORT_LABEL_KR[k]}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px' }}>
          {sorted.length === 0 ? (
            <div data-testid="hall-empty" style={{ padding: '40px 16px', textAlign: 'center', color: '#888' }}>
              아직 기록이 없다. 첫 cycle 을 마치면 자동 등록된다.
            </div>
          ) : (
            sorted.map((e, idx) => (
              <div key={e.id} data-testid={`hall-entry-${idx}`} style={{ padding: '8px 0', borderBottom: idx === sorted.length - 1 ? 'none' : '1px solid #2a2d38', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 28, fontSize: 16, fontWeight: 600, color: '#ffd700' }}>{idx + 1}.</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#ddd' }}>
                    <span style={{ marginRight: 6 }}>{CAUSE_EMOJI[e.cause] ?? '◯'}</span>
                    <span>{e.heroName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {e.realm ? `${e.realm} · ` : ''}lv {e.maxLevel.toLocaleString()} · {e.ageEnd}세 · {e.cause}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
