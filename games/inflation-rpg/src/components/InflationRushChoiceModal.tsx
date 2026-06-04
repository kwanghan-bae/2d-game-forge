import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 10000; // C993: 10s auto-resolve for idle compatibility

/**
 * C989+C993: Inflation Rush choice — ride (×2 EXP) or cash out (level×50 gold).
 * Auto-resolves to 'ride' after 10s (EXP is the safe idle default).
 */
export function InflationRushChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          controller?.setInflationRushChoice('ride');
          onClose();
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller, onClose]);

  if (!controller) return null;

  const handleRide = () => {
    controller.setInflationRushChoice('ride');
    onClose();
  };

  const handleCashout = () => {
    controller.setInflationRushChoice('cashout');
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '2px solid #ffd700',
        borderRadius: 12, padding: 24, maxWidth: 340, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>⚡ 인플레이션 러시!</div>
        <p style={{ color: '#ccc', fontSize: 14, marginBottom: 16 }}>
          폭발의 여파가 남아있다. 어떻게 할 것인가?
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={handleRide}
            style={{
              padding: '12px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #2196f3, #1565c0)', color: '#fff',
              fontWeight: 'bold', fontSize: 14, minWidth: 120,
            }}
          >
            🏃 질주<br />
            <span style={{ fontSize: 11, opacity: 0.85 }}>×2 EXP (5~8전투)</span>
          </button>
          <button
            onClick={handleCashout}
            style={{
              padding: '12px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #ffc107, #ff8f00)', color: '#1a1a1a',
              fontWeight: 'bold', fontSize: 14, minWidth: 120,
            }}
          >
            💰 현금화<br />
            <span style={{ fontSize: 11, opacity: 0.85 }}>즉시 Gold 획득</span>
          </button>
        </div>
        {/* C993: countdown progress bar */}
        <div style={{
          marginTop: 12, height: 4, borderRadius: 2,
          background: '#333', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #2196f3, #ffc107)',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          {Math.ceil(timeLeft / 1000)}초 후 자동 질주
        </div>
      </div>
    </div>
  );
}
