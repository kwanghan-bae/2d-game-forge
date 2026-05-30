import { useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface EventToggle {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

const EVENT_TOGGLES: EventToggle[] = [
  { id: 'gambler', label: '도박사', emoji: '🎲', description: '골드 2배 또는 절반' },
  { id: 'cursedAltar', label: '저주 제단', emoji: '☠️', description: 'ATK ×1.5, 피해 ×3, 사망방지 차단 (15턴)' },
  { id: 'merchant', label: '상인', emoji: '🏪', description: '렐릭 구매 (600G)' },
  { id: 'restShrine', label: '휴식 제단', emoji: '🛏️', description: '전체 회복, 콤보 초기화' },
  { id: 'blacksmith', label: '대장장이', emoji: '🔨', description: '영구 ATK +5' },
];

// Global strategy state — persists during the run
let strategyState: Record<string, boolean> = {
  gambler: true,
  cursedAltar: true,
  merchant: true,
  restShrine: true,
  blacksmith: true,
};

export function getStrategyEnabled(id: string): boolean {
  return strategyState[id] ?? true;
}

export function resetStrategy(): void {
  strategyState = { gambler: true, cursedAltar: true, merchant: true, restShrine: true, blacksmith: true };
}

interface Props {
  onClose: () => void;
}

export function StrategyPanel({ onClose }: Props) {
  const [toggles, setToggles] = useState({ ...strategyState });
  const controller = useCycleStoreV2(s => s.controller);

  const handleToggle = (id: string) => {
    const newVal = !toggles[id];
    setToggles(prev => ({ ...prev, [id]: newVal }));
    strategyState[id] = newVal;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e', border: '1px solid #daa520', borderRadius: '12px',
        padding: '20px', width: '320px', color: '#e0e0e0',
      }}>
        <h3 style={{ color: '#daa520', margin: '0 0 12px' }}>⚙️ 전략 설정</h3>
        <p style={{ fontSize: '11px', color: '#888', margin: '0 0 12px' }}>
          원하지 않는 이벤트를 끄면 해당 이벤트가 발생하지 않습니다.
        </p>
        {EVENT_TOGGLES.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px', borderRadius: '6px', marginBottom: '4px',
            background: toggles[t.id] ? 'rgba(218,165,32,0.1)' : 'rgba(100,100,100,0.1)',
          }}>
            <button
              type="button"
              onClick={() => handleToggle(t.id)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px', border: 'none',
                background: toggles[t.id] ? '#daa520' : '#444', cursor: 'pointer',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px',
                left: toggles[t.id] ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
            <span>{t.emoji}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.label}</div>
              <div style={{ fontSize: '10px', color: '#888' }}>{t.description}</div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '12px', width: '100%', padding: '8px',
            background: '#daa520', border: 'none', borderRadius: '6px',
            color: '#000', fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
