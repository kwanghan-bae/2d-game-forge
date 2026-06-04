import React, { useEffect, useState, useCallback } from 'react';

type SpectacleItem =
  | { id: string; kind: 'inflation_burst'; atkMul: number }
  | { id: string; kind: 'inflation_rush' }
  | { id: string; kind: 'vc_progress'; current: number; total: number; hpPercent: number }
  | { id: string; kind: 'vc_survival_burst'; value: number };

interface Props {
  queue: readonly SpectacleItem[];
  onDone: (id: string) => void;
}

const DISPLAY_MS = 2000;

/** C984: Renders event spectacle notifications (inflation burst, VC progress, etc.) */
export function EventSpectacleLayer({ queue, onDone }: Props) {
  const [current, setCurrent] = useState<SpectacleItem | null>(null);

  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      onDone(current.id);
      setCurrent(null);
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [current, onDone]);

  if (!current) return null;

  return (
    <div style={{
      position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, pointerEvents: 'none', textAlign: 'center',
    }}>
      {current.kind === 'inflation_burst' && (
        <div style={{
          fontSize: 32, fontWeight: 900, color: '#ffcc00',
          textShadow: '0 0 20px #ff6600, 0 0 40px #ff3300',
          animation: 'spectacle-pop 0.3s ease-out',
        }}>
          ⚡ INFLATION BURST ×{current.atkMul}! ⚡
        </div>
      )}
      {current.kind === 'inflation_rush' && (
        <div style={{
          fontSize: 20, fontWeight: 700, color: '#88ff88',
          textShadow: '0 0 10px #00ff00',
        }}>
          🔥 RUSH MODE — ×2 EXP 🔥
        </div>
      )}
      {current.kind === 'vc_progress' && (
        <div style={{
          fontSize: 16, fontWeight: 600, color: '#ff8888',
          background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: 8,
        }}>
          ⚔️ 도전 {current.current}/{current.total} — HP {Math.round(current.hpPercent * 100)}%
        </div>
      )}
      {current.kind === 'vc_survival_burst' && (
        <div style={{
          fontSize: 24, fontWeight: 800, color: '#ffdd44',
          textShadow: '0 0 15px #ffaa00',
        }}>
          🏆 돌파 성공! +{current.value} EXP 🏆
        </div>
      )}
    </div>
  );
}

export type { SpectacleItem };
