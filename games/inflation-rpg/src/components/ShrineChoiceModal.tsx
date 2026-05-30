import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

/**
 * C579: Treasure Shrine choice modal — player picks gold, exp, or heal.
 * First real in-combat decision point.
 */
export function ShrineChoiceModal({ onClose }: { onClose: () => void }) {
  const controller = useCycleStoreV2(s => s.controller);

  const choose = (choice: 0 | 1 | 2) => {
    if (controller) controller.setShrineChoice(choice);
    onClose();
  };

  return (
    <div style={{
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => choose(0)}
            style={{ padding: '12px 16px', fontSize: 15, background: '#2a2a4a', border: '1px solid #ffd700', borderRadius: 8, color: '#ffd700', cursor: 'pointer' }}
          >
            💰 황금 축복 (+500 골드)
          </button>
          <button
            onClick={() => choose(1)}
            style={{ padding: '12px 16px', fontSize: 15, background: '#2a2a4a', border: '1px solid #88f', borderRadius: 8, color: '#88f', cursor: 'pointer' }}
          >
            📖 지혜의 축복 (+300 경험치)
          </button>
          <button
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
