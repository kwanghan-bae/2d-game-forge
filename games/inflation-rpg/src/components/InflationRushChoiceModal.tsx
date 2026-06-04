import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onClose: () => void;
}

/**
 * C989: Inflation Rush choice — ride (×2 EXP for 5-8 fights) or cash out (level×50 gold).
 * No timeout: this is a meaningful decision the player should make consciously.
 */
export function InflationRushChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  if (!controller) return null;

  const handleRide = () => {
    controller.setInflationRushChoice('ride');
    onClose();
  };

  const handleCashout = () => {
    controller.setInflationRushChoice('cashout');
    onClose();
  };

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
      </div>
    </div>
  );
}
