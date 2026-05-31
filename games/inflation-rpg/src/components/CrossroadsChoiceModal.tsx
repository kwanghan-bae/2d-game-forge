import { useCycleStoreV2 } from '../overworld/cycleSliceV2';
import { useEffect, useState } from 'react';

interface Props {
  onClose: () => void;
}

const TIMEOUT_MS = 4000; // 4-second decision window (3-way needs more time)

/**
 * C878: Crossroads choice modal — pick ATK buff, EXP buff, or Gold burst.
 * Auto-picks ATK after 4s timeout (idle-friendly default).
 */
export function CrossroadsChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 100) {
          controller?.setCrossroadsChoice('atk');
          onClose();
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller, onClose]);

  if (!controller) return null;

  const handleChoice = (path: 'atk' | 'exp' | 'gold') => {
    controller.setCrossroadsChoice(path);
    onClose();
  };

  const progress = timeLeft / TIMEOUT_MS;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #c080f0', borderRadius: 12,
        padding: 24, maxWidth: 360, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>🔀 갈림길</div>
        <p style={{ color: '#ddd', marginBottom: 16 }}>
          세 갈래 길이 나타났다. 어느 길을 선택할 것인가?
        </p>
        {/* Timer bar */}
        <div style={{
          height: 4, background: '#333', borderRadius: 2, marginBottom: 16, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#c080f0', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => handleChoice('atk')} style={{
            padding: '10px 16px', background: '#c44', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            ⚔️ 공격력<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>ATK 버프</span>
          </button>
          <button onClick={() => handleChoice('exp')} style={{
            padding: '10px 16px', background: '#36a', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            📚 경험치<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>EXP 버프</span>
          </button>
          <button onClick={() => handleChoice('gold')} style={{
            padding: '10px 16px', background: '#a82', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer',
            minWidth: 90, minHeight: 44,
          }}>
            💰 재물<br/>
            <span style={{ fontSize: 11, opacity: 0.8 }}>골드 즉시</span>
          </button>
        </div>
      </div>
    </div>
  );
}
