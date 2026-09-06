import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 3000;

/**
 * C881: Wandering Merchant choice modal — heal, ATK buff, or gamble.
 * Auto-picks heal after 3s timeout (safe default for idle).
 */
export function WanderingMerchantChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          controller?.setWanderingMerchantChoice('heal');
          onCloseRef.current();
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller]);

  if (!controller) return null;

  const handleChoice = (choice: 'heal' | 'atk' | 'gamble') => {
    controller.setWanderingMerchantChoice(choice);
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #e8a030', borderRadius: 12,
        padding: 24, maxWidth: 360, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🏪 떠돌이 상인</div>
        <p style={{ color: '#ddd', marginBottom: 16 }}>
          떠돌이 상인이 거래를 제안한다. 무엇을 원하는가?
        </p>
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#e8a030', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => handleChoice('heal')} style={{
            padding: '10px 16px', background: '#2a7', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            💚 회복<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>HP 회복</span>
          </button>
          <button onClick={() => handleChoice('atk')} style={{
            padding: '10px 16px', background: '#c44', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            ⚔️ 강화<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>ATK 버프</span>
          </button>
          <button onClick={() => handleChoice('gamble')} style={{
            padding: '10px 16px', background: '#a6a', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            🎲 도박<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>고위험 고수익</span>
          </button>
        </div>
      </div>
    </div>
  );
}
