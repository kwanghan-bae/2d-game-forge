import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 3000; // 3-second decision window

/**
 * C878: Mercenary Offer choice modal — hire (pay gold) or decline.
 * Auto-accepts after 3s timeout (idle-friendly).
 */
export function MercenaryChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          controller?.setMercenaryChoice(true);
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
    controller.setMercenaryChoice(true);
    onClose();
  };

  const handleDecline = () => {
    controller.setMercenaryChoice(false);
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #4a9', borderRadius: 12,
        padding: 24, maxWidth: 320, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️ 용병의 제안</div>
        <p style={{ color: '#ddd', marginBottom: 8 }}>
          용병이 보호를 제안한다!<br/>
          골드 일부를 지불하고 피해 감소 버프
        </p>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>
          수락: 골드 소모 + 방어 버프 · 거절: 비용 없음
        </p>
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#4a9', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={handleAccept} style={{
            padding: '10px 20px', background: '#2a7', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            🛡️ 고용
          </button>
          <button onClick={handleDecline} style={{
            padding: '10px 20px', background: '#444', border: 'none',
            borderRadius: 8, color: '#ccc', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            ❌ 거절
          </button>
        </div>
      </div>
    </div>
  );
}
