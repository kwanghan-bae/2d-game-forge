import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onClose: () => void;
}

/**
 * C604: Real-time danger zone fight/retreat choice modal.
 * Shows when danger zone is encountered — player decides immediately.
 */
export function DangerChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  if (!controller) return null;

  const hero = controller.getHero();
  const retreatCost = Math.max(50, hero.level * 3);

  const handleFight = () => {
    controller.setDangerChoice(false);
    onClose();
  };

  const handleRetreat = () => {
    controller.setDangerChoice(true);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #f44', borderRadius: 12,
        padding: 24, maxWidth: 320, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️ 위험지대!</div>
        <p style={{ color: '#ddd', marginBottom: 8 }}>
          강력한 적 출현! (EXP ×4, GOLD ×3)<br/>
          적 스탯 ×2.5 — 도전하시겠습니까?
        </p>
        <div style={{ marginBottom: 12, fontSize: 12, color: '#aaa' }}>
          HP: {Math.round(hero.hp / hero.hpMax * 100)}%
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={handleFight} style={{
            padding: '10px 20px', background: '#c44', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            ⚔️ 전투!
          </button>
          <button onClick={handleRetreat} style={{
            padding: '10px 20px', background: '#444', border: '1px solid #888',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            🏃 도주 (-{retreatCost}G)
          </button>
        </div>
      </div>
    </div>
  );
}
