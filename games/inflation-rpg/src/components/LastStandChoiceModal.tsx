import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 3000; // 3-second decision window

/**
 * C893a: Last Stand choice modal — accept (+40% ATK, -20% HP) or decline (heal + gold).
 * Auto-declines after 3s timeout (safe default for idle players).
 */
export function LastStandChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          controller?.setLastStandChoice('decline');
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
    controller.setLastStandChoice('accept');
    onClose();
  };

  const handleDecline = () => {
    controller.setLastStandChoice('decline');
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #c44', borderRadius: 12,
        padding: 24, maxWidth: 320, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔥 최후의 항전</div>
        <p style={{ color: '#ddd', marginBottom: 8 }}>
          마지막 힘을 끌어올릴 수 있다!<br/>
          ATK 대폭 상승, 대신 HP 를 희생
        </p>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
          수락: ATK +40% (12턴) / HP −20% · 거절: HP 회복 + 골드
        </p>
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#c44', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={handleAccept} style={{
            padding: '10px 20px', background: '#c33', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            🔥 수락
          </button>
          <button onClick={handleDecline} style={{
            padding: '10px 20px', background: '#444', border: 'none',
            borderRadius: 8, color: '#ccc', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            🛡️ 거절
          </button>
        </div>
      </div>
    </div>
  );
}
