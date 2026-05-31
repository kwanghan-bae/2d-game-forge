import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 2000; // 2-second decision window

/**
 * C875: Proving Grounds choice modal — accept challenge or decline.
 * Auto-accepts after 2s timeout (idle-friendly fallback).
 */
export function ProvingChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          // Timeout → auto-accept (AI default)
          controller?.setProvingChoice(true);
          onClose();
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller, onClose]);

  if (!controller) return null;

  const handleAccept = () => {
    controller.setProvingChoice(true);
    onClose();
  };

  const handleDecline = () => {
    controller.setProvingChoice(false);
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #f0c040', borderRadius: 12,
        padding: 24, maxWidth: 320, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🏟️ 시련의 장</div>
        <p style={{ color: '#ddd', marginBottom: 8 }}>
          강자의 시련이 나타났다!<br/>
          승리 시 EXP ×2.0 (5전투)
        </p>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
          실패 시 HP −10% · 회피 시 소량 골드
        </p>
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#f0c040', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={handleAccept} style={{
            padding: '10px 20px', background: '#c44', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            ⚔️ 도전
          </button>
          <button onClick={handleDecline} style={{
            padding: '10px 20px', background: '#444', border: 'none',
            borderRadius: 8, color: '#ccc', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            🚫 회피
          </button>
        </div>
      </div>
    </div>
  );
}
