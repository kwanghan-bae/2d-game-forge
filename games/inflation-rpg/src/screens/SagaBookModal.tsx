import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { REALM_CATALOG } from '../data/realms';
import type { SagaEventType } from '../saga/SagaTypes';

interface Props {
  onClose: () => void;
}

type EventFilter = 'all' | 'battle' | 'drop' | 'levelUp' | 'realm' | 'npc' | 'rejuv' | 'sightseeing' | 'meditation' | 'trial' | 'season';

function matchesFilter(t: SagaEventType, f: EventFilter): boolean {
  switch (f) {
    case 'all':         return true;
    case 'battle':      return t === 'battle';
    case 'drop':        return t === 'drop';
    case 'levelUp':     return t === 'levelUp';
    case 'npc':         return t === 'moralChoice' || t === 'shrine';
    case 'rejuv':       return t === 'rejuvenation';
    case 'realm':       return false; // realm transitions render separately below
    case 'sightseeing': return t === 'sightseeing';
    case 'meditation':  return t === 'meditation';
    case 'trial':       return t === 'trial';
    case 'season':      return t === 'seasonChange';
  }
}

export function SagaBookModal({ onClose }: Props) {
  const saga = useGameStore(s => s.meta.eternalSaga);
  const [filter, setFilter] = useState<EventFilter>('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // group by era, sorted
  const eras = Object.values(saga.chaptersByEra).sort((a, b) => {
    if (a.rejuvCount !== b.rejuvCount) return a.rejuvCount - b.rejuvCount;
    const order = ['어린시절', '청년기', '장년기', '노년기', '마지막'];
    return order.indexOf(a.chapter) - order.indexOf(b.chapter);
  });

  return (
    <div data-testid="saga-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div data-testid="saga-modal" style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', background: '#1a1d28', color: '#eee', borderRadius: 12, border: '1px solid #444', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>인생의 기록</strong>
          <span style={{ fontSize: 12, color: '#aaa' }}>재생 #{saga.rejuvenationCount}</span>
          <button type="button" data-testid="saga-modal-close" onClick={onClose} style={{ minHeight: 44, padding: '6px 12px', background: '#3b4252', color: '#eee', border: '1px solid #555', borderRadius: 6, fontSize: 13 }}>✕</button>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #333', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'battle', 'drop', 'levelUp', 'realm', 'npc', 'rejuv', 'sightseeing', 'meditation', 'trial', 'season'] as EventFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-testid={`saga-filter-${f}`}
              style={{ padding: '4px 8px', background: filter === f ? '#3b4252' : '#262830', color: '#eee', border: '1px solid #555', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
            >
              {f === 'all' ? '전체' : f}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 16px' }}>
          {eras.map(era => {
            const filteredEvents = era.events.filter(e => matchesFilter(e.type, filter));
            if (filteredEvents.length === 0) return null;
            return (
              <div key={era.eraKey} style={{ marginBottom: 16 }}>
                {era.rejuvCount > 0 && era.chapter === '어린시절' && (
                  <div data-testid={`saga-rejuv-marker-${era.rejuvCount}`} style={{
                    fontSize: 16, fontWeight: 700, color: '#ffd54f',
                    textAlign: 'center', padding: '12px 0',
                    background: 'linear-gradient(90deg, transparent, rgba(255,213,79,0.2), transparent)',
                    margin: '16px -16px 8px',
                  }}>
                    ✨ 재생 #{era.rejuvCount} ✨
                  </div>
                )}
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: era.rejuvCount > 0 ? '#ffd54f' : '#eee',
                  borderBottom: era.rejuvCount > 0 ? '2px solid #ffd54f' : '1px solid #555',
                  padding: '6px 0', marginBottom: 6,
                }}>
                  {era.eraKey}
                </div>
                {filteredEvents.map((ev, i) => (
                  <div key={i} data-testid="saga-event" style={{ fontSize: 12, color: '#ccc', padding: '4px 0', borderLeft: '2px solid #444', paddingLeft: 8, marginBottom: 2 }}>
                    <span style={{ color: '#888', marginRight: 6 }}>{ev.age}세</span>
                    {ev.narrativeText}
                  </div>
                ))}
              </div>
            );
          })}
          {saga.realmTransitions.length > 0 && (filter === 'all' || filter === 'realm') && (
            <div style={{ marginTop: 16, borderTop: '1px solid #333', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>영역 전환 기록</div>
              {saga.realmTransitions.map((t, i) => {
                const fromName = REALM_CATALOG.find(r => r.id === t.from)?.nameKR ?? t.from;
                const toName = REALM_CATALOG.find(r => r.id === t.to)?.nameKR ?? t.to;
                return (
                  <div key={i} style={{ fontSize: 12, color: '#ccc' }}>
                    <span style={{ color: '#888' }}>{t.atAge}세</span> {fromName} → {toName}
                  </div>
                );
              })}
            </div>
          )}
          {eras.length === 0 && (
            <div data-testid="saga-empty" style={{ textAlign: 'center', color: '#666', padding: 24 }}>
              아직 기록된 사건이 없다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
