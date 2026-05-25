import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Cycle 108 F1 — Fate Roll on Death modal.
 *
 * Mid-cycle decision channel surfaced when hero would die in combat and the
 * cycle's fate roll has not yet been consumed. Two options:
 *   A. 균열석 1 소비 → HP 50% 회복 (option disabled when meta.crackStones < 1)
 *   B. 운명을 받아들인다 → 사망 path (level -10% + hero_died emit)
 * 5초 미응답 → 자동 옵션 B (idle 정체성 보호).
 *
 * Modal mount 자체로 controller 의 fateRollConsumed=true 가 마킹된다 — 즉
 * 사용자가 옵션 A/B 를 클릭하지 않고 modal 이 unmount 되어도 cycle 당 1 회
 * cap 은 즉시 소진. PRD §F1.동작(2) "lean 단순화".
 */

interface Props {
  oldLevel: number;
  pendingDeathPenaltyNewLevel: number;
  /** controller.resolveFateRoll wrapper — Runner 가 적절히 wire 한다. */
  onResolve: (choice: 'accept' | 'decline') => void;
}

const TIMEOUT_MS = 5000;

export function FateRollModal({ oldLevel, pendingDeathPenaltyNewLevel, onResolve }: Props) {
  const crackStones = useGameStore(s => s.meta.crackStones);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TIMEOUT_MS / 1000));
  const [resolved, setResolved] = useState(false);

  // PRD §F1.동작(6): 5s hard timeout → auto-decline. Cleanup on resolve so
  // the timer never fires post-click (double-resolve guarded in controller).
  useEffect(() => {
    if (resolved) return;
    const tick = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    const timeout = setTimeout(() => {
      if (!resolved) {
        setResolved(true);
        onResolve('decline');
      }
    }, TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [onResolve, resolved]);

  const choose = (choice: 'accept' | 'decline') => {
    if (resolved) return;
    setResolved(true);
    onResolve(choice);
  };

  const acceptDisabled = crackStones < 1;

  return (
    <div
      data-testid="fate-roll-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        data-testid="fate-roll-modal"
        style={{
          width: 'min(380px, 92vw)',
          background: '#1a1d28',
          color: '#eee',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #8b5cf6',
          boxShadow: '0 0 24px rgba(139, 92, 246, 0.4)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#c4b5fd' }}>
          운명의 기로
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
          영웅이 쓰러지려 한다. 균열석으로 운명을 거스를 것인가?
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          수용 시 레벨 패널티: LV {oldLevel} → {pendingDeathPenaltyNewLevel}
        </div>
        <button
          type="button"
          data-testid="fate-roll-accept"
          disabled={acceptDisabled}
          onClick={() => choose('accept')}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 44,
            marginBottom: 8,
            padding: '10px 14px',
            background: acceptDisabled ? '#2a2433' : '#5b21b6',
            color: acceptDisabled ? '#666' : '#eee',
            border: `1px solid ${acceptDisabled ? '#444' : '#8b5cf6'}`,
            borderRadius: 6,
            fontSize: 13,
            cursor: acceptDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          균열석 1 소비 (HP 50% 회복) · 보유 {crackStones.toLocaleString()}
        </button>
        <button
          type="button"
          data-testid="fate-roll-decline"
          onClick={() => choose('decline')}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 44,
            padding: '10px 14px',
            background: '#3b4252',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          운명을 받아들인다
        </button>
        <div
          data-testid="fate-roll-countdown"
          style={{
            marginTop: 12,
            fontSize: 11,
            color: '#888',
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          {secondsLeft}초 후 자동 수용
        </div>
      </div>
    </div>
  );
}
