import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

const IDLE_TIMEOUT_MS = 4000;

/**
 * C579: Treasure Shrine choice modal — player picks gold, exp, or heal.
 * First real in-combat decision point.
 */
export function ShrineChoiceModal({ onClose }: { onClose: () => void }) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(IDLE_TIMEOUT_MS);
  const resolvedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(current => {
        if (resolvedRef.current) return 0;
        if (current <= 100) {
          resolvedRef.current = true;
          // Gold is the predictable, non-destructive idle default.
          controller?.setShrineChoice(0);
          onCloseRef.current();
          return 0;
        }
        return current - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller]);

  const choose = (choice: 0 | 1 | 2) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (controller) controller.setShrineChoice(choice);
    onClose();
  };

  return (
    <div data-testid="shrine-choice-modal" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #ffd700', borderRadius: 12,
        padding: 24, maxWidth: 320, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, marginBottom: 16, color: '#ffd700' }}>
          ✨ 보물 신전 발견!
        </div>
        <div style={{ fontSize: 14, color: '#ccc', marginBottom: 20 }}>
          축복을 선택하세요
        </div>
        <div style={{ height: 4, background: '#333', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#ffd700', width: `${(timeLeft / IDLE_TIMEOUT_MS) * 100}%`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ marginBottom: 16, fontSize: 11, color: '#888' }}>
          {Math.ceil(timeLeft / 1000)}초 후 자동 황금 축복
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            data-testid="shrine-choice-gold"
            onClick={() => choose(0)}
            style={{ padding: '12px 16px', fontSize: 15, background: '#2a2a4a', border: '1px solid #ffd700', borderRadius: 8, color: '#ffd700', cursor: 'pointer' }}
          >
            💰 황금 축복 (+500 골드)
          </button>
          <button
            data-testid="shrine-choice-exp"
            onClick={() => choose(1)}
            style={{ padding: '12px 16px', fontSize: 15, background: '#2a2a4a', border: '1px solid #88f', borderRadius: 8, color: '#88f', cursor: 'pointer' }}
          >
            📖 지혜의 축복 (+300 경험치)
          </button>
          <button
            data-testid="shrine-choice-heal"
            onClick={() => choose(2)}
            style={{ padding: '12px 16px', fontSize: 15, background: '#2a2a4a', border: '1px solid #8f8', borderRadius: 8, color: '#8f8', cursor: 'pointer' }}
          >
            💚 치유의 축복 (HP 30% 회복)
          </button>
        </div>
      </div>
    </div>
  );
}
