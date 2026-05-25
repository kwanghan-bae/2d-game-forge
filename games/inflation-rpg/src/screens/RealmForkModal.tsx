import { useEffect, useState } from 'react';
import type { RealmForkCard, RealmForkCardId } from '../buff/realmForkCatalog';
import type { RealmId } from '../types';

/**
 * Cycle 110 F1 — Realm Fork modal.
 *
 * Realm 전환 *직전* 2 path 카드 (위험/안전) 중 1 택 surface. PRD §F1.
 *
 *   - 6 초 timeout (fate roll 5초 / boss intro 8초 의 중간값)
 *   - timeout 시 trait-based auto-choice (heroic > prudent → risk, else safe)
 *   - 2 cards (risk / safe) 고정 — random sampling 없음
 *   - keyboard 1/2 키도 risk/safe 선택 (a11y + 스피드런)
 *
 * cycle 108 FateRollModal + cycle 109 BossIntroModal 의 backdrop / countdown
 * / data-testid 패턴 mirror. 3 instance 의 공통점 추출 (`<MidCycleDecisionModal/>`)
 * 은 본 cycle F2 에서.
 */

const TIMEOUT_MS = 6000;

interface Props {
  oldRealm: RealmId;
  newRealm: RealmId;
  newRealmNameKR: string;
  riskCard: RealmForkCard;
  safeCard: RealmForkCard;
  autoChoice: RealmForkCardId;
  onResolve: (choice: RealmForkCardId) => void;
}

const CARD_COLORS: Record<RealmForkCardId, { bg: string; border: string; accent: string }> = {
  risk: { bg: '#3a1f1f', border: '#a04545', accent: '#ef4444' },
  safe: { bg: '#1f3a2f', border: '#4d8a6a', accent: '#6fdc99' },
};

export function RealmForkModal({ newRealmNameKR, riskCard, safeCard, autoChoice, onResolve }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TIMEOUT_MS / 1000));
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (resolved) return;
    const tick = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    const timeout = setTimeout(() => {
      if (!resolved) {
        setResolved(true);
        onResolve(autoChoice);
      }
    }, TIMEOUT_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [onResolve, resolved, autoChoice]);

  // Keyboard 1/2 shortcuts.
  useEffect(() => {
    if (resolved) return;
    const onKey = (e: KeyboardEvent) => {
      if (resolved) return;
      if (e.key === '1') {
        setResolved(true);
        onResolve('risk');
      } else if (e.key === '2') {
        setResolved(true);
        onResolve('safe');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResolve, resolved]);

  const choose = (choice: RealmForkCardId) => {
    if (resolved) return;
    setResolved(true);
    onResolve(choice);
  };

  const cards: ReadonlyArray<{ idx: 0 | 1; card: RealmForkCard }> = [
    { idx: 0, card: riskCard },
    { idx: 1, card: safeCard },
  ];

  return (
    <div
      data-testid="realm-fork-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        data-testid="realm-fork-modal"
        style={{
          width: 'min(520px, 96vw)',
          background: '#161a24',
          color: '#eee',
          borderRadius: 14,
          padding: 22,
          border: '1px solid #ef4444',
          boxShadow: '0 0 28px rgba(239, 68, 68, 0.45)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#fde68a' }}>
          갈래길
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 14 }}>
          <strong style={{ color: '#fff' }}>{newRealmNameKR}</strong> 입구 — 두 갈래 중 하나를 택하라.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map(({ idx, card }) => {
            const palette = CARD_COLORS[card.id];
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`realm-fork-card-${card.id}`}
                data-card-id={card.id}
                onClick={() => choose(card.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 56,
                  padding: '10px 14px',
                  background: palette.bg,
                  color: '#eee',
                  border: `1px solid ${palette.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: palette.accent }}>
                    {idx + 1}. {card.nameKR}
                  </span>
                  {autoChoice === card.id && (
                    <span style={{ fontSize: 10, color: palette.accent, opacity: 0.8 }}>
                      자동 선택 후보
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
                  {card.descKR}
                </div>
              </button>
            );
          })}
        </div>
        <div
          data-testid="realm-fork-countdown"
          style={{
            marginTop: 14,
            fontSize: 11,
            color: '#888',
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          {secondsLeft}초 후 자동 선택
        </div>
      </div>
    </div>
  );
}
