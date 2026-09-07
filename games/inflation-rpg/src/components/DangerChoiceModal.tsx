import { useEffect, useRef, useState } from 'react';
import { useCycleStoreV2 } from '../overworld/cycleSliceV2';

interface Props {
  onClose: () => void;
}

const IDLE_TIMEOUT_MS = 4000;

/**
 * C604: Real-time danger zone fight/retreat choice modal.
 * Shows when danger zone is encountered — player decides immediately.
 */
export function DangerChoiceModal({ onClose }: Props) {
  const controller = useCycleStoreV2(s => s.controller);
  const hero = controller?.getHero() ?? null;
  const shouldAutoRetreat = hero !== null
    && hero.hpMax > 0
    && hero.hp / hero.hpMax < 0.5;
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
          // Keep a healthy run moving, but avoid an idle death spiral when
          // the hero is already below half HP.
          controller?.setDangerChoice(shouldAutoRetreat);
          onCloseRef.current();
          return 0;
        }
        return current - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [controller, shouldAutoRetreat]);

  if (!controller || !hero) return null;
  const retreatCost = Math.max(50, hero.level * 3);

  const handleChoice = (retreat: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    controller.setDangerChoice(retreat);
    onClose();
  };

  const handleFight = () => {
    handleChoice(false);
  };

  const handleRetreat = () => {
    handleChoice(true);
  };

  return (
    <div data-testid="danger-choice-modal" style={{
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
        <div style={{ height: 4, background: '#333', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#f0c040', width: `${(timeLeft / IDLE_TIMEOUT_MS) * 100}%`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ marginBottom: 12, fontSize: 11, color: '#888' }}>
          {Math.ceil(timeLeft / 1000)}초 후 자동 {shouldAutoRetreat ? '도주' : '전투'}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button data-testid="danger-choice-fight" onClick={handleFight} style={{
            padding: '10px 20px', background: '#c44', border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer',
            minWidth: 100, minHeight: 44,
          }}>
            ⚔️ 전투!
          </button>
          <button data-testid="danger-choice-retreat" onClick={handleRetreat} style={{
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
